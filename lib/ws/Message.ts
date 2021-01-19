export class Message {
  type: any;
  data: any;

  constructor(type: any, data: any) {
    this.type = type;
    this.data = data;
  }

  toJSON() {
    return {
      t: this.type /* eslint-disable-line id-length */,
      d: this.data /* eslint-disable-line id-length */,
    };
  }
}
