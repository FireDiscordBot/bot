import { AbortController } from "abort-controller";
import * as FormData from "@discordjs/form-data";
import { RequestOptions } from "./APIRouter";
import { RESTManager } from "./RESTManager";
import { Fire } from "@fire/lib/Fire";
import * as centra from "centra";

export class APIRequest {
  options: RequestOptions;
  rest: RESTManager;
  retries: number;
  method: string;
  route: string;
  client: Fire;
  path: string;
  constructor(
    rest: RESTManager,
    method: string,
    path: string,
    options: RequestOptions
  ) {
    this.rest = rest;
    this.client = rest.client;
    this.method = method;
    this.route = options.route;
    this.options = options;
    this.retries = 0;

    let queryString = "";
    if (options.query) {
      const query = Object.entries(options.query)
        .filter(([, value]) => value !== null && typeof value !== "undefined")
        .flatMap(([key, value]) =>
          Array.isArray(value) ? value.map((v) => [key, v]) : [[key, value]]
        );
      queryString = new URLSearchParams(query).toString();
    }
    this.path = `${path}${queryString && `?${queryString}`}`;
  }

  make() {
    if (this.options.debug)
      this.client.console.warn(
        `[Rest] Creating request for ${this.method.toUpperCase()} ${this.path}`
      );
    const API =
      this.options.versioned === false
        ? this.client.options.http.api
        : `${this.client.options.http.api}/v${this.client.options.http.version}`;
    const url = API + this.path;
    let headers: {
      [key: string]: any;
    } = this.client.useCanary
      ? { ...this.client.options.http.headers, "x-debug-options": "canary" }
      : { ...this.client.options.http.headers };

    if (this.options.auth !== false)
      headers.Authorization = this.rest.getAuth();
    if (this.options.reason)
      headers["X-Audit-Log-Reason"] = encodeURIComponent(this.options.reason);
    headers["User-Agent"] = this.client.manager.djsua;
    if (this.options.headers)
      headers = Object.assign(headers, this.options.headers);

    let body: FormData | BodyInit;
    if (this.options.files && this.options.files.length) {
      body = new FormData();
      for (const [index, file] of this.options.files.entries())
        if (file && file.file)
          body.append(file.key ?? `files[${index}]`, file.file, file.name);
      if (typeof this.options.data !== "undefined") {
        if (this.options.dontUsePayloadJSON) {
          for (const [key, value] of Object.entries(this.options.data))
            body.append(key, value);
        } else {
          body.append("payload_json", JSON.stringify(this.options.data));
        }
      }
      headers = Object.assign(headers, body.getHeaders());
    } else if (this.options.data != null) body = this.options.data;

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.client.options.restRequestTimeout
    );
    const request = centra(url, this.method).body(
      body instanceof FormData ? body.getBuffer() : body,
      body instanceof FormData ? "buffer" : "json"
    );
    for (const [name, value] of Object.entries(headers))
      if (value) request.header(name, value);
    if (this.options.debug)
      this.client.console.warn(
        `[Rest] Sending request to ${this.method.toUpperCase()} ${this.path}`
      );
    const start = +new Date();
    return request.send().finally(() => {
      clearTimeout(timeout);
      this.client.restPing = +new Date() - start;
      if (this.options.debug)
        this.client.console.warn(
          `[Rest] Finished request to ${this.method.toUpperCase()} ${
            this.path
          } in ${this.client.restPing}ms`
        );
    });
  }
}
