--
-- PostgreSQL database dump
--

-- Dumped from database version 10.23 (Ubuntu 10.23-0ubuntu0.18.04.2)
-- Dumped by pg_dump version 10.23 (Ubuntu 10.23-0ubuntu0.18.04.2)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: plpgsql; Type: EXTENSION; Schema: -; Owner: 
--

CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog;


--
-- Name: EXTENSION plpgsql; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION plpgsql IS 'PL/pgSQL procedural language';


SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: aliases; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.aliases (
    uid text NOT NULL,
    aliases text[]
);


ALTER TABLE public.aliases OWNER TO postgres;

--
-- Name: assistant; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.assistant (
    uid text NOT NULL,
    access_token text,
    refresh_token text
);


ALTER TABLE public.assistant OWNER TO postgres;

--
-- Name: bans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bans (
    gid text NOT NULL,
    uid text NOT NULL,
    until text DEFAULT 0
);


ALTER TABLE public.bans OWNER TO postgres;

--
-- Name: blacklist; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.blacklist (
    "user" text,
    uid text,
    reason text,
    perm integer
);


ALTER TABLE public.blacklist OWNER TO postgres;

--
-- Name: buildoverrides; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.buildoverrides (
    id bigint NOT NULL,
    bucket integer NOT NULL,
    releasechannel text NOT NULL,
    userids text[],
    expiry timestamp without time zone,
    hash text NOT NULL,
    experiment bigint NOT NULL
);


ALTER TABLE public.buildoverrides OWNER TO postgres;

--
-- Name: customers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customers (
    cid text NOT NULL,
    email text,
    discord text NOT NULL,
    status text DEFAULT 'unpaid'::text NOT NULL,
    paid boolean DEFAULT false NOT NULL,
    active boolean DEFAULT false NOT NULL,
    cantrial boolean DEFAULT true NOT NULL
);


ALTER TABLE public.customers OWNER TO postgres;

--
-- Name: datapackages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.datapackages (
    id text NOT NULL,
    status text DEFAULT 'starting collection'::text NOT NULL
);


ALTER TABLE public.datapackages OWNER TO postgres;

--
-- Name: experimentfilters; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.experimentfilters (
    id bigint NOT NULL,
    bucket integer NOT NULL,
    features text[],
    min_range integer,
    max_range integer,
    min_members integer,
    max_members integer,
    min_id bigint,
    max_id bigint,
    min_boosts integer,
    max_boosts integer,
    boost_tier integer
);


ALTER TABLE public.experimentfilters OWNER TO postgres;

--
-- Name: experiments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.experiments (
    id bigint NOT NULL,
    kind text NOT NULL,
    label text NOT NULL,
    buckets integer[],
    data json,
    active boolean DEFAULT true
);


ALTER TABLE public.experiments OWNER TO postgres;

--
-- Name: guildconfig; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.guildconfig (
    gid bigint NOT NULL,
    data jsonb NOT NULL
);


ALTER TABLE public.guildconfig OWNER TO postgres;

--
-- Name: invrole; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invrole (
    gid text,
    rid text,
    inv text
);


ALTER TABLE public.invrole OWNER TO postgres;

--
-- Name: modlogs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.modlogs (
    gid text,
    uid text,
    type text,
    reason text,
    caseid text,
    modid text,
    created timestamp without time zone
);


ALTER TABLE public.modlogs OWNER TO postgres;

--
-- Name: mutes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mutes (
    gid text DEFAULT 0 NOT NULL,
    uid text DEFAULT 0 NOT NULL,
    until text DEFAULT 0
);


ALTER TABLE public.mutes OWNER TO postgres;

--
-- Name: permroles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.permroles (
    gid text NOT NULL,
    rid text NOT NULL,
    allow text NOT NULL,
    deny text NOT NULL
);


ALTER TABLE public.permroles OWNER TO postgres;

--
-- Name: premium_stripe; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.premium_stripe (
    uid text NOT NULL,
    subscription text NOT NULL,
    customer text NOT NULL,
    serverlimit integer DEFAULT 0 NOT NULL,
    guilds text[],
    periodend timestamp without time zone NOT NULL,
    status text DEFAULT 'unpaid'::text NOT NULL,
    active boolean DEFAULT true
);


ALTER TABLE public.premium_stripe OWNER TO postgres;

--
-- Name: reactrole; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reactrole (
    gid text NOT NULL,
    mid text,
    eid text,
    rid text
);


ALTER TABLE public.reactrole OWNER TO postgres;

--
-- Name: referrals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.referrals (
    url text NOT NULL,
    count integer DEFAULT 0 NOT NULL,
    code text
);


ALTER TABLE public.referrals OWNER TO postgres;

--
-- Name: remind; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.remind (
    uid text NOT NULL,
    forwhen timestamp without time zone,
    reminder text,
    link text
);


ALTER TABLE public.remind OWNER TO postgres;

--
-- Name: rolepersists; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rolepersists (
    gid text,
    uid text,
    roles text[]
);


ALTER TABLE public.rolepersists OWNER TO postgres;

--
-- Name: starboard; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.starboard (
    gid text NOT NULL,
    original text NOT NULL,
    board text NOT NULL
);


ALTER TABLE public.starboard OWNER TO postgres;

--
-- Name: starboard_reactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.starboard_reactions (
    gid text NOT NULL,
    mid text NOT NULL,
    reactions integer DEFAULT 1 NOT NULL
);


ALTER TABLE public.starboard_reactions OWNER TO postgres;

--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subscriptions (
    id text NOT NULL,
    cid text NOT NULL,
    discord text NOT NULL,
    product text NOT NULL,
    price text NOT NULL,
    status text DEFAULT 'unpaid'::text NOT NULL,
    link text NOT NULL,
    cancelonend boolean NOT NULL,
    cancelat timestamp without time zone,
    periodstart timestamp without time zone,
    periodend timestamp without time zone,
    created timestamp without time zone,
    ended timestamp without time zone,
    trialstart timestamp without time zone,
    trialend timestamp without time zone
);


ALTER TABLE public.subscriptions OWNER TO postgres;

--
-- Name: tags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tags (
    gid text,
    name text,
    content text,
    uid text,
    aliases text[],
    uses integer DEFAULT 0
);


ALTER TABLE public.tags OWNER TO postgres;

--
-- Name: userconfig; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.userconfig (
    uid bigint NOT NULL,
    data jsonb NOT NULL
);


ALTER TABLE public.userconfig OWNER TO postgres;

--
-- Name: vanity; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vanity (
    gid text,
    code text NOT NULL,
    invite text,
    clicks integer DEFAULT 0,
    links integer DEFAULT 0,
    redirect text,
    uid text,
    description text
);


ALTER TABLE public.vanity OWNER TO postgres;

--
-- Name: vanitybl; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vanitybl (
    guild text NOT NULL,
    gid text NOT NULL,
    reason text
);


ALTER TABLE public.vanitybl OWNER TO postgres;

--
-- Name: vcroles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vcroles (
    gid text NOT NULL,
    rid text NOT NULL,
    cid text NOT NULL
);


ALTER TABLE public.vcroles OWNER TO postgres;

--
-- Name: assistant assistant_uid_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assistant
    ADD CONSTRAINT assistant_uid_key UNIQUE (uid);


--
-- Name: guildconfig single_guild; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.guildconfig
    ADD CONSTRAINT single_guild UNIQUE (gid);


--
-- Name: userconfig single_user; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.userconfig
    ADD CONSTRAINT single_user UNIQUE (uid);


--
-- Name: experiments unique_id; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.experiments
    ADD CONSTRAINT unique_id UNIQUE (id, label);


--
-- Name: invrole unique_inv; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invrole
    ADD CONSTRAINT unique_inv UNIQUE (inv);


--
-- Name: vcroles vcroles_cid_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vcroles
    ADD CONSTRAINT vcroles_cid_key UNIQUE (cid);


--
-- Name: TABLE aliases; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.aliases TO grafana;


--
-- Name: TABLE blacklist; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.blacklist TO grafana;


--
-- Name: TABLE guildconfig; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.guildconfig TO grafana;


--
-- Name: TABLE invrole; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.invrole TO grafana;


--
-- Name: TABLE modlogs; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.modlogs TO grafana;


--
-- Name: TABLE mutes; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.mutes TO grafana;


--
-- Name: TABLE reactrole; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.reactrole TO grafana;


--
-- Name: TABLE referrals; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.referrals TO grafana;


--
-- Name: TABLE remind; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.remind TO grafana;


--
-- Name: TABLE rolepersists; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.rolepersists TO grafana;


--
-- Name: TABLE tags; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.tags TO grafana;


--
-- Name: TABLE vanity; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.vanity TO grafana;


--
-- Name: TABLE vanitybl; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.vanitybl TO grafana;


--
-- PostgreSQL database dump complete
--

