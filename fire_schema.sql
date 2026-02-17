--
-- PostgreSQL database dump
--

\restrict 953I0quCnllVkg2ActaOfQXcGtZRrRyOXf6nYHsjtfk8xsYoxT2S9w1AnQBgmYM

-- Dumped from database version 18.1 (Ubuntu 18.1-1.pgdg24.04+2)
-- Dumped by pg_dump version 18.1 (Ubuntu 18.1-1.pgdg24.04+2)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: aliases; Type: TABLE; Schema: public; Owner: fire
--

CREATE TABLE IF NOT EXISTS public.aliases (
    uid text NOT NULL,
    aliases text[]
);

ALTER TABLE public.aliases OWNER TO fire;

--
-- Name: appeals; Type: TABLE; Schema: public; Owner: fire
--

CREATE TABLE IF NOT EXISTS public.appeals (
    gid text NOT NULL PRIMARY KEY,
    notbefore bigint DEFAULT 0 NOT NULL,
    notafter bigint DEFAULT 0 NOT NULL,
    items jsonb DEFAULT '[]'::jsonb NOT NULL
);

ALTER TABLE public.appeals OWNER TO fire;

--
-- Name: assistant; Type: TABLE; Schema: public; Owner: fire
--

CREATE TABLE IF NOT EXISTS public.assistant (
    uid text NOT NULL UNIQUE,
    access_token text,
    refresh_token text
);

ALTER TABLE public.assistant OWNER TO fire;

--
-- Name: bans; Type: TABLE; Schema: public; Owner: fire
--

CREATE TABLE IF NOT EXISTS public.bans (
    gid text NOT NULL,
    uid text NOT NULL,
    until text DEFAULT 0
);

ALTER TABLE public.bans OWNER TO fire;

--
-- Name: blacklist; Type: TABLE; Schema: public; Owner: fire
--

CREATE TABLE IF NOT EXISTS public.blacklist (
    "user" text,
    uid text,
    reason text,
    perm integer
);

ALTER TABLE public.blacklist OWNER TO fire;

--
-- Name: buildoverrides; Type: TABLE; Schema: public; Owner: fire
--

CREATE TABLE IF NOT EXISTS public.buildoverrides (
    id bigint NOT NULL,
    bucket integer NOT NULL,
    releasechannel text NOT NULL,
    userids text[],
    expiry timestamp without time zone,
    hash text NOT NULL,
    experiment bigint NOT NULL
);

ALTER TABLE public.buildoverrides OWNER TO fire;

--
-- Name: command_usage; Type: TABLE; Schema: public; Owner: fire
--

CREATE TABLE IF NOT EXISTS public.command_usage (
    gid bigint NOT NULL,
    command text NOT NULL,
    count bigint DEFAULT 0,
    PRIMARY KEY (gid, command)
);

ALTER TABLE public.command_usage OWNER TO fire;

--
-- Name: customers; Type: TABLE; Schema: public; Owner: fire
--

CREATE TABLE IF NOT EXISTS public.customers (
    cid text NOT NULL,
    email text,
    discord text NOT NULL,
    status text DEFAULT 'unpaid'::text NOT NULL,
    paid boolean DEFAULT false NOT NULL,
    active boolean DEFAULT false NOT NULL,
    cantrial boolean DEFAULT true NOT NULL
);

ALTER TABLE public.customers OWNER TO fire;

--
-- Name: datapackages; Type: TABLE; Schema: public; Owner: fire
--

CREATE TABLE IF NOT EXISTS public.datapackages (
    id text NOT NULL,
    status text DEFAULT 'starting collection'::text NOT NULL
);

ALTER TABLE public.datapackages OWNER TO fire;

--
-- Name: embeds; Type: TABLE; Schema: public; Owner: fire
--

CREATE TABLE IF NOT EXISTS public.embeds (
    id text NOT NULL PRIMARY KEY,
    uid text NOT NULL,
    embed jsonb NOT NULL
);

ALTER TABLE public.embeds OWNER TO fire;

--
-- Name: experimentfilters; Type: TABLE; Schema: public; Owner: fire
--

CREATE TABLE IF NOT EXISTS public.experimentfilters (
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

ALTER TABLE public.experimentfilters OWNER TO fire;

--
-- Name: experiments; Type: TABLE; Schema: public; Owner: fire
--

CREATE TABLE IF NOT EXISTS public.experiments (
    id bigint NOT NULL,
    kind text NOT NULL,
    label text NOT NULL,
    buckets integer[],
    data json,
    active boolean DEFAULT true,
    UNIQUE (id, label)
);

ALTER TABLE public.experiments OWNER TO fire;

--
-- Name: guildconfig; Type: TABLE; Schema: public; Owner: fire
--

CREATE TABLE IF NOT EXISTS public.guildconfig (
    gid bigint NOT NULL UNIQUE,
    data jsonb NOT NULL
);

ALTER TABLE public.guildconfig OWNER TO fire;

--
-- Name: invrole; Type: TABLE; Schema: public; Owner: fire
--

CREATE TABLE IF NOT EXISTS public.invrole (
    gid text,
    rid text,
    inv text,
    UNIQUE (gid, inv)
);

ALTER TABLE public.invrole OWNER TO fire;

--
-- Name: lookback; Type: TABLE; Schema: public; Owner: fire
--

CREATE TABLE IF NOT EXISTS public.lookback (
    uid text NOT NULL PRIMARY KEY,
    data jsonb NOT NULL
);

ALTER TABLE public.lookback OWNER TO fire;

--
-- Name: modlogs; Type: TABLE; Schema: public; Owner: fire
--

CREATE TABLE IF NOT EXISTS public.modlogs (
    gid text,
    uid text,
    type text,
    reason text,
    caseid text,
    modid text,
    created timestamp without time zone,
    appealid text,
    appealstatus text
);

ALTER TABLE public.modlogs OWNER TO fire;

--
-- Name: mutes; Type: TABLE; Schema: public; Owner: fire
--

CREATE TABLE IF NOT EXISTS public.mutes (
    gid text DEFAULT 0 NOT NULL,
    uid text DEFAULT 0 NOT NULL,
    until text DEFAULT 0
);

ALTER TABLE public.mutes OWNER TO fire;

--
-- Name: permroles; Type: TABLE; Schema: public; Owner: fire
--

CREATE TABLE IF NOT EXISTS public.permroles (
    gid text NOT NULL,
    rid text NOT NULL,
    allow text NOT NULL,
    deny text NOT NULL
);

ALTER TABLE public.permroles OWNER TO fire;

--
-- Name: premium_stripe; Type: TABLE; Schema: public; Owner: fire
--

CREATE TABLE IF NOT EXISTS public.premium_stripe (
    uid text NOT NULL,
    subscription text NOT NULL,
    customer text NOT NULL,
    serverlimit integer DEFAULT 0 NOT NULL,
    guilds text[],
    periodend timestamp without time zone NOT NULL,
    status text DEFAULT 'unpaid'::text NOT NULL,
    active boolean DEFAULT true
);

ALTER TABLE public.premium_stripe OWNER TO fire;

--
-- Name: reactrole; Type: TABLE; Schema: public; Owner: fire
--

CREATE TABLE IF NOT EXISTS public.reactrole (
    gid text NOT NULL,
    mid text,
    eid text,
    rid text
);

ALTER TABLE public.reactrole OWNER TO fire;

--
-- Name: referrals; Type: TABLE; Schema: public; Owner: fire
--

CREATE TABLE IF NOT EXISTS public.referrals (
    url text NOT NULL,
    count integer DEFAULT 0 NOT NULL,
    code text
);

ALTER TABLE public.referrals OWNER TO fire;

--
-- Name: remind; Type: TABLE; Schema: public; Owner: fire
--

CREATE TABLE IF NOT EXISTS public.remind (
    uid text NOT NULL,
    forwhen timestamp without time zone,
    reminder text,
    link text
);

ALTER TABLE public.remind OWNER TO fire;

--
-- Name: rolepersists; Type: TABLE; Schema: public; Owner: fire
--

CREATE TABLE IF NOT EXISTS public.rolepersists (
    gid text,
    uid text,
    roles text[]
);

ALTER TABLE public.rolepersists OWNER TO fire;

--
-- Name: starboard; Type: TABLE; Schema: public; Owner: fire
--

CREATE TABLE IF NOT EXISTS public.starboard (
    gid text NOT NULL,
    original text NOT NULL,
    board text NOT NULL
);

ALTER TABLE public.starboard OWNER TO fire;

--
-- Name: starboard_reactions; Type: TABLE; Schema: public; Owner: fire
--

CREATE TABLE IF NOT EXISTS public.starboard_reactions (
    gid text NOT NULL,
    mid text NOT NULL,
    reactions integer DEFAULT 1 NOT NULL
);

ALTER TABLE public.starboard_reactions OWNER TO fire;

--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: fire
--

CREATE TABLE IF NOT EXISTS public.subscriptions (
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

ALTER TABLE public.subscriptions OWNER TO fire;

--
-- Name: tags; Type: TABLE; Schema: public; Owner: fire
--

CREATE TABLE IF NOT EXISTS public.tags (
    gid text,
    name text,
    content text,
    uid text,
    aliases text[],
    uses integer DEFAULT 0
);

ALTER TABLE public.tags OWNER TO fire;

--
-- Name: userconfig; Type: TABLE; Schema: public; Owner: fire
--

CREATE TABLE IF NOT EXISTS public.userconfig (
    uid bigint NOT NULL UNIQUE,
    data jsonb NOT NULL
);

ALTER TABLE public.userconfig OWNER TO fire;

--
-- Name: vanity; Type: TABLE; Schema: public; Owner: fire
--

CREATE TABLE IF NOT EXISTS public.vanity (
    gid text,
    code text NOT NULL,
    invite text,
    clicks integer DEFAULT 0,
    links integer DEFAULT 0,
    redirect text,
    uid text,
    description text
);

ALTER TABLE public.vanity OWNER TO fire;

--
-- Name: vanitybl; Type: TABLE; Schema: public; Owner: fire
--

CREATE TABLE IF NOT EXISTS public.vanitybl (
    guild text NOT NULL,
    gid text NOT NULL,
    reason text
);

ALTER TABLE public.vanitybl OWNER TO fire;

--
-- Name: vcroles; Type: TABLE; Schema: public; Owner: fire
--

CREATE TABLE IF NOT EXISTS public.vcroles (
    gid text NOT NULL,
    rid text NOT NULL,
    cid text NOT NULL UNIQUE
);

ALTER TABLE public.vcroles OWNER TO fire;

--
-- Name: words; Type: TABLE; Schema: public; Owner: fire
--

CREATE TABLE IF NOT EXISTS public.words (
    word text NOT NULL PRIMARY KEY
);

ALTER TABLE public.words OWNER TO fire;

--
-- Name: idx_bans_gid_uid; Type: INDEX; Schema: public; Owner: fire
--
CREATE INDEX IF NOT EXISTS idx_bans_gid_uid ON public.bans (gid, uid);

--
-- Name: idx_mutes_gid_uid; Type: INDEX; Schema: public; Owner: fire
--
CREATE INDEX IF NOT EXISTS idx_mutes_gid_uid ON public.mutes (gid, uid);

--
-- Name: idx_modlogs_gid_uid; Type: INDEX; Schema: public; Owner: fire
--
CREATE INDEX IF NOT EXISTS idx_modlogs_gid_uid ON public.modlogs (gid, uid);

--
-- Name: idx_modlogs_caseid; Type: INDEX; Schema: public; Owner: fire
--
CREATE INDEX IF NOT EXISTS idx_modlogs_caseid ON public.modlogs (caseid);

--
-- Name: idx_starboard_gid_original; Type: INDEX; Schema: public; Owner: fire
--
CREATE INDEX IF NOT EXISTS idx_starboard_gid_original ON public.starboard (gid, original);

--
-- Name: idx_starboard_reactions_gid_mid; Type: INDEX; Schema: public; Owner: fire
--
CREATE INDEX IF NOT EXISTS idx_starboard_reactions_gid_mid ON public.starboard_reactions (gid, mid);

--
-- Name: idx_tags_gid_name; Type: INDEX; Schema: public; Owner: fire
--
CREATE INDEX IF NOT EXISTS idx_tags_gid_name ON public.tags (gid, name);

--
-- Name: idx_vanity_code; Type: INDEX; Schema: public; Owner: fire
--
CREATE INDEX IF NOT EXISTS idx_vanity_code ON public.vanity (code);

--
-- Name: idx_subscriptions_discord_cid; Type: INDEX; Schema: public; Owner: fire
--
CREATE INDEX IF NOT EXISTS idx_subscriptions_discord_cid ON public.subscriptions (discord, cid);

--
-- Name: idx_blacklist_uid; Type: INDEX; Schema: public; Owner: fire
--
CREATE INDEX IF NOT EXISTS idx_blacklist_uid ON public.blacklist (uid);

--
-- Name: idx_remind_uid; Type: INDEX; Schema: public; Owner: fire
--
CREATE INDEX IF NOT EXISTS idx_remind_uid ON public.remind (uid);

--
-- Name: idx_remind_forwhen; Type: INDEX; Schema: public; Owner: fire
--
CREATE INDEX IF NOT EXISTS idx_remind_forwhen ON public.remind (forwhen);

--
-- PostgreSQL database dump complete
--

\unrestrict 953I0quCnllVkg2ActaOfQXcGtZRrRyOXf6nYHsjtfk8xsYoxT2S9w1AnQBgmYM
