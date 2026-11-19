--
-- PostgreSQL database dump
--

\restrict mn8nXEmncgm5N7WZNJuWhe6fPbmUbttQT1fg5k6Gn88FzZL4un2IO1nrmnoud0e

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.7 (Homebrew)

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

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _bak_024_member_event; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._bak_024_member_event (
    id bigint,
    user_id text,
    kind text,
    subscription_id text,
    subscription_type text,
    reason text,
    actor_id text,
    at timestamp with time zone,
    meta jsonb
);


--
-- Name: _bak_024_member_referral; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._bak_024_member_referral (
    id uuid,
    referrer_user_id text,
    referred_user_id text,
    code text,
    subscription_type text,
    status text,
    reward_earned_at timestamp with time zone,
    reward_applied_at timestamp with time zone,
    created_at timestamp with time zone,
    subscription_id uuid,
    qualifying_trans_id text,
    reward_subscription_id uuid,
    reward_note text
);


--
-- Name: _bak_024_member_referral_code; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._bak_024_member_referral_code (
    id uuid,
    user_id text,
    code text,
    is_active boolean,
    created_at timestamp with time zone
);


--
-- Name: _bak_024_order; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._bak_024_order (
    id uuid,
    provider text,
    provider_ref text,
    user_email text,
    amount text,
    currency text,
    meta jsonb,
    created_at timestamp with time zone,
    refunded_at timestamp with time zone,
    user_id text,
    kind text,
    refunded_amount numeric(10,2),
    checkout_id uuid
);


--
-- Name: _bak_024_partner; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._bak_024_partner (
    id uuid,
    user_id text,
    code text,
    is_active boolean,
    payout_notes text,
    created_at timestamp with time zone,
    created_by text,
    display_name text
);


--
-- Name: _bak_024_partner_referral; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._bak_024_partner_referral (
    id uuid,
    partner_id uuid,
    referred_user_id text,
    code text,
    subscription_type text,
    discount_amount numeric(10,2),
    commission_amount numeric(10,2),
    first_charge_order_id uuid,
    payout_status text,
    paid_at timestamp with time zone,
    paid_notes text,
    created_at timestamp with time zone,
    subscription_id uuid,
    voided_at timestamp with time zone,
    void_reason text
);


--
-- Name: _bak_024_payment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._bak_024_payment (
    id bigint,
    provider text,
    trans_id text,
    kind text,
    user_id text,
    user_email text,
    subscription_id text,
    subscription_type text,
    pay_num integer,
    order_id uuid,
    ticket_id uuid,
    event_id text,
    amount numeric(10,2),
    list_amount numeric(10,2),
    discount_amount numeric(10,2),
    discount_kind text,
    promo_code text,
    occurred_at timestamp with time zone,
    refunded_amount numeric(10,2),
    refunded_at timestamp with time zone,
    source text,
    verified_at timestamp with time zone,
    created_at timestamp with time zone
);


--
-- Name: _bak_024_saved_card; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._bak_024_saved_card (
    id uuid,
    user_id text,
    customer_profile_id text,
    payment_profile_id text,
    card_type text,
    last_four text,
    expiration_month text,
    expiration_year text,
    is_default boolean,
    nickname text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    status text,
    exp_month smallint,
    exp_year smallint,
    deleted_at timestamp with time zone,
    verified_at timestamp with time zone,
    source text,
    environment text
);


--
-- Name: _bak_024_ticket; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._bak_024_ticket (
    id uuid,
    user_id text,
    event_id text,
    order_id uuid,
    code text,
    quantity integer,
    first_name text,
    last_name text,
    gem_id text,
    amount_paid numeric(10,2),
    transaction_id text,
    refunded boolean,
    refunded_at timestamp with time zone,
    entered_into_gem boolean,
    created_at timestamp with time zone,
    voided_at timestamp with time zone,
    checkout_id uuid
);


--
-- Name: _bak_024_user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._bak_024_user (
    id text,
    email text,
    hashed_password text,
    first_name text,
    last_name text,
    gem_id text,
    role text,
    customer_profile_id text,
    subscription_id text,
    subscription_type text,
    subscription_status text,
    subscription_start_date timestamp with time zone,
    subscription_end_date timestamp with time zone,
    next_billing_date timestamp with time zone,
    created_at timestamp with time zone,
    used_partner_code text,
    additional_roles text[],
    comp_reason text,
    comped_at timestamp with time zone,
    comped_by text,
    last_subscription_id text
);


--
-- Name: billing_notice; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.billing_notice (
    id bigint NOT NULL,
    kind text NOT NULL,
    ref text NOT NULL,
    user_id text,
    sent_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: billing_notice_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.billing_notice_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: billing_notice_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.billing_notice_id_seq OWNED BY public.billing_notice.id;


--
-- Name: billing_run; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.billing_run (
    id bigint NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    finished_at timestamp with time zone,
    mode text NOT NULL,
    summary jsonb,
    error text
);


--
-- Name: billing_run_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.billing_run_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: billing_run_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.billing_run_id_seq OWNED BY public.billing_run.id;


--
-- Name: ca_conversion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ca_conversion (
    id bigint NOT NULL,
    visitor_id uuid,
    user_id text,
    kind text NOT NULL,
    at timestamp with time zone DEFAULT now() NOT NULL,
    session_id uuid,
    path text,
    meta jsonb
);


--
-- Name: ca_conversion_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ca_conversion_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ca_conversion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ca_conversion_id_seq OWNED BY public.ca_conversion.id;


--
-- Name: ca_event; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ca_event (
    id bigint NOT NULL,
    view_id uuid NOT NULL,
    entry_id uuid,
    type text NOT NULL,
    label text,
    depth smallint,
    at timestamp with time zone DEFAULT now() NOT NULL,
    vod_id uuid,
    course_id uuid,
    lesson_id uuid,
    CONSTRAINT ca_event_owner_check CHECK (((entry_id IS NOT NULL) OR (vod_id IS NOT NULL) OR (course_id IS NOT NULL)))
);


--
-- Name: ca_event_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ca_event_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ca_event_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ca_event_id_seq OWNED BY public.ca_event.id;


--
-- Name: ca_pageview; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ca_pageview (
    id uuid NOT NULL,
    visitor_id uuid NOT NULL,
    session_id uuid NOT NULL,
    user_id text,
    audience text NOT NULL,
    path text NOT NULL,
    route text,
    entry_id uuid,
    view_id uuid,
    source text,
    referrer_domain text,
    from_path text,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    device text,
    browser text,
    os text,
    country text,
    viewport_w integer,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    last_seen_at timestamp with time zone DEFAULT now() NOT NULL,
    visible_seconds integer DEFAULT 0 NOT NULL
);


--
-- Name: ca_view; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ca_view (
    id uuid NOT NULL,
    entry_id uuid,
    visitor_id uuid NOT NULL,
    session_id uuid NOT NULL,
    user_id text,
    audience text NOT NULL,
    gated boolean DEFAULT false NOT NULL,
    kind text NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    last_seen_at timestamp with time zone DEFAULT now() NOT NULL,
    qualified boolean DEFAULT false NOT NULL,
    source text DEFAULT 'direct'::text NOT NULL,
    referrer_domain text,
    from_path text,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    device text,
    browser text,
    os text,
    country text,
    viewport_w integer,
    visible_seconds integer DEFAULT 0 NOT NULL,
    engaged_seconds integer DEFAULT 0 NOT NULL,
    max_depth smallint DEFAULT 0 NOT NULL,
    depth_seconds jsonb DEFAULT '[]'::jsonb NOT NULL,
    sections jsonb DEFAULT '{}'::jsonb NOT NULL,
    completed boolean DEFAULT false NOT NULL,
    video_seconds integer DEFAULT 0 NOT NULL,
    video_duration integer,
    video_max_pct smallint DEFAULT 0 NOT NULL,
    video_bins jsonb DEFAULT '[]'::jsonb NOT NULL,
    video_plays integer DEFAULT 0 NOT NULL,
    video_seeks integer DEFAULT 0 NOT NULL,
    video_completed boolean DEFAULT false NOT NULL,
    exit_type text,
    exit_target text,
    vod_id uuid,
    course_id uuid,
    lesson_id uuid,
    CONSTRAINT ca_view_owner_check CHECK (((entry_id IS NOT NULL) OR (vod_id IS NOT NULL) OR (course_id IS NOT NULL)))
);


--
-- Name: checkout; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.checkout (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    event_id text,
    idempotency_key text NOT NULL,
    invoice_number text,
    status text NOT NULL,
    quantity smallint NOT NULL,
    list_cents integer NOT NULL,
    discount_cents integer DEFAULT 0 NOT NULL,
    amount_cents integer NOT NULL,
    payload jsonb NOT NULL,
    trans_id text,
    order_id uuid,
    last_error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    course_id uuid,
    consent_given boolean DEFAULT false NOT NULL,
    consent_text text,
    consent_at timestamp with time zone,
    consent_ip text,
    consent_user_agent text,
    CONSTRAINT checkout_target_check CHECK (((event_id IS NOT NULL) <> (course_id IS NOT NULL)))
);


--
-- Name: checkout_item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.checkout_item (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    checkout_id uuid NOT NULL,
    course_id uuid NOT NULL,
    teacher_id text,
    "position" smallint NOT NULL,
    title text NOT NULL,
    list_cents integer NOT NULL,
    member_discount_cents integer DEFAULT 0 NOT NULL,
    price_cents integer NOT NULL,
    fee_cents integer DEFAULT 0 NOT NULL,
    paid_cents integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT checkout_item_list_cents_check CHECK ((list_cents >= 0))
);


--
-- Name: circuit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.circuit (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    short text NOT NULL,
    region text,
    timezone text DEFAULT 'America/Chicago'::text NOT NULL,
    color text DEFAULT '#5c5a52'::text NOT NULL,
    blurb text,
    sort integer DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    image_url text,
    image_path text,
    CONSTRAINT circuit_color_check CHECK ((color ~ '^#[0-9a-fA-F]{6}$'::text))
);


--
-- Name: cms_author_profile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cms_author_profile (
    user_id text NOT NULL,
    display_name text,
    title text,
    bio text,
    avatar_media_id uuid,
    links jsonb DEFAULT '[]'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    handle text
);


--
-- Name: cms_course; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cms_course (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    description text,
    cover_image_id uuid,
    thumbnail_image_id uuid,
    trailer_video_provider text,
    trailer_mux_upload_id text,
    trailer_mux_asset_id text,
    trailer_mux_playback_id text,
    trailer_video_status text,
    trailer_video_duration integer,
    trailer_video_aspect_ratio text,
    trailer_youtube_url text,
    trailer_youtube_video_id text,
    trailer_youtube_title text,
    trailer_youtube_thumbnail_url text,
    trailer_youtube_duration integer,
    price numeric(10,2) DEFAULT 0.00 NOT NULL,
    premium_discount_pct integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    published_at timestamp with time zone,
    author_id text,
    draft_title text,
    draft_description text,
    draft_cover_image_id uuid,
    draft_thumbnail_image_id uuid,
    draft_updated_at timestamp with time zone,
    draft_updated_by text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    submitted_at timestamp with time zone,
    review_note text,
    first_published_at timestamp with time zone,
    exclusive boolean DEFAULT true NOT NULL,
    exclusivity_start date,
    exclusivity_end date,
    auto_renew boolean DEFAULT true NOT NULL,
    agreement_status text DEFAULT 'active'::text NOT NULL,
    content_updated_at timestamp with time zone
);


--
-- Name: cms_entry; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cms_entry (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    excerpt text,
    cover_image_id uuid,
    thumbnail_image_id uuid,
    body jsonb,
    read_time integer,
    video_provider text,
    mux_upload_id text,
    mux_asset_id text,
    mux_playback_id text,
    video_status text,
    video_duration integer,
    video_aspect_ratio text,
    youtube_url text,
    youtube_video_id text,
    youtube_title text,
    youtube_thumbnail_url text,
    youtube_duration integer,
    access_mode text DEFAULT 'free'::text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    published_at timestamp with time zone,
    scheduled_for timestamp with time zone,
    author_id text,
    draft_title text,
    draft_excerpt text,
    draft_body jsonb,
    draft_cover_image_id uuid,
    draft_thumbnail_image_id uuid,
    draft_read_time integer,
    draft_updated_at timestamp with time zone,
    draft_updated_by text,
    source text DEFAULT 'custom'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    draft_meta jsonb
);


--
-- Name: cms_entry_tag; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cms_entry_tag (
    entry_id uuid NOT NULL,
    tag_id uuid NOT NULL
);


--
-- Name: cms_lesson; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cms_lesson (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    module_id uuid NOT NULL,
    course_id uuid NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    is_preview boolean DEFAULT false NOT NULL,
    body jsonb,
    read_time integer,
    video_provider text,
    mux_upload_id text,
    mux_asset_id text,
    mux_playback_id text,
    video_status text,
    video_duration integer,
    video_aspect_ratio text,
    youtube_url text,
    youtube_video_id text,
    youtube_title text,
    youtube_thumbnail_url text,
    youtube_duration integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    published_at timestamp with time zone,
    first_published_at timestamp with time zone,
    draft_title text,
    draft_body jsonb,
    draft_updated_at timestamp with time zone
);


--
-- Name: cms_lesson_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cms_lesson_progress (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    lesson_id uuid NOT NULL,
    completed_at timestamp with time zone,
    last_position_seconds integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: cms_media; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cms_media (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    uploaded_by text,
    storage_path text NOT NULL,
    url text NOT NULL,
    mime_type text,
    width integer,
    height integer,
    alt text,
    created_at timestamp with time zone DEFAULT now(),
    name text,
    file_size integer,
    status text DEFAULT 'ready'::text NOT NULL,
    variant_prefix text,
    variant_widths integer[],
    has_avif boolean DEFAULT false NOT NULL,
    blur text,
    credit text,
    credit_url text,
    derived_from uuid,
    updated_at timestamp with time zone DEFAULT now(),
    library text DEFAULT 'content'::text NOT NULL,
    course_id uuid,
    entry_id uuid,
    CONSTRAINT cms_media_library_check CHECK ((library = ANY (ARRAY['content'::text, 'classroom'::text, 'studio'::text, 'profile'::text]))),
    CONSTRAINT cms_media_status_check CHECK ((status = ANY (ARRAY['uploading'::text, 'processing'::text, 'ready'::text, 'failed'::text])))
);


--
-- Name: cms_module; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cms_module (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_id uuid NOT NULL,
    title text NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: cms_revision; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cms_revision (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    body jsonb NOT NULL,
    saved_by text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: cms_tag; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cms_tag (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: contact_message; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contact_message (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    thread_id uuid NOT NULL,
    author_id text,
    from_staff boolean DEFAULT false NOT NULL,
    internal boolean DEFAULT false NOT NULL,
    body text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: contact_thread; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contact_thread (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    token text NOT NULL,
    user_id text,
    name text NOT NULL,
    email text NOT NULL,
    topic text DEFAULT 'general'::text NOT NULL,
    subject text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    ip text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_message_at timestamp with time zone DEFAULT now() NOT NULL,
    last_member_at timestamp with time zone DEFAULT now() NOT NULL,
    last_staff_at timestamp with time zone,
    member_read_at timestamp with time zone DEFAULT now() NOT NULL,
    staff_read_at timestamp with time zone,
    CONSTRAINT contact_thread_status_check CHECK ((status = ANY (ARRAY['open'::text, 'done'::text])))
);


--
-- Name: course_activity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.course_activity (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_id uuid NOT NULL,
    actor_id text,
    kind text NOT NULL,
    lesson_id uuid,
    note text,
    data jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: course_changelog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.course_changelog (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_id uuid NOT NULL,
    lesson_id uuid,
    kind text NOT NULL,
    note text,
    author_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: course_enrollment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.course_enrollment (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_id uuid NOT NULL,
    user_id text NOT NULL,
    source text NOT NULL,
    order_id uuid,
    added_by text,
    last_lesson_id uuid,
    last_seen_at timestamp with time zone,
    muted_at timestamp with time zone,
    muted_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone,
    revoked_reason text,
    first_opened_at timestamp with time zone
);


--
-- Name: course_post; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.course_post (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_id uuid NOT NULL,
    lesson_id uuid,
    parent_id uuid,
    author_id text,
    kind text DEFAULT 'post'::text NOT NULL,
    title text,
    body text NOT NULL,
    pinned boolean DEFAULT false NOT NULL,
    locked boolean DEFAULT false NOT NULL,
    status text DEFAULT 'visible'::text NOT NULL,
    flag_reasons text[] DEFAULT '{}'::text[] NOT NULL,
    reviewed_by text,
    reviewed_at timestamp with time zone,
    review_note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    edited_at timestamp with time zone,
    last_reply_at timestamp with time zone,
    deleted_at timestamp with time zone
);


--
-- Name: course_post_report; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.course_post_report (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    post_id uuid NOT NULL,
    reporter_id text NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone
);


--
-- Name: course_sale; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.course_sale (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_id uuid NOT NULL,
    teacher_id text,
    enrollment_id uuid,
    order_id uuid,
    trans_id text,
    gross_cents integer NOT NULL,
    refunded_cents integer DEFAULT 0 NOT NULL,
    share_pct smallint DEFAULT 90 NOT NULL,
    sold_at timestamp with time zone DEFAULT now() NOT NULL,
    payable_at timestamp with time zone NOT NULL,
    payout_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: decklists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.decklists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id text NOT NULL,
    user_id text,
    gem_id text,
    player_name text NOT NULL,
    hero text,
    format text,
    placement integer,
    cards jsonb NOT NULL,
    raw_text text,
    is_public boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: event_player_heroes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_player_heroes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    season text NOT NULL,
    circuit text NOT NULL,
    month text NOT NULL,
    gem_id text,
    player_name text NOT NULL,
    hero text NOT NULL,
    country_region text,
    created_at timestamp with time zone DEFAULT now(),
    event_id text
);


--
-- Name: events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.events (
    id text NOT NULL,
    title text NOT NULL,
    location text,
    address text,
    price numeric(10,2) NOT NULL,
    format text,
    gem_id_required boolean DEFAULT false,
    circuit text,
    month text,
    event_date timestamp with time zone,
    description text,
    premium_discount boolean DEFAULT false,
    status text DEFAULT 'upcoming'::text,
    closed_at timestamp with time zone,
    closed_by text,
    created_by text,
    created_at timestamp with time zone DEFAULT now(),
    tournament_results jsonb,
    player_cap integer,
    store_id uuid
);


--
-- Name: fab_card_lookup; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fab_card_lookup (
    lookup_key text NOT NULL,
    name text NOT NULL,
    image_url text,
    fallback_url text,
    pitch integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: guide_read; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.guide_read (
    user_id text NOT NULL,
    course_id uuid NOT NULL,
    month date NOT NULL,
    first_read_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: guide_refund_request; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.guide_refund_request (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    checkout_item_id uuid NOT NULL,
    order_id uuid NOT NULL,
    user_id text NOT NULL,
    course_id uuid,
    teacher_id text,
    reason text NOT NULL,
    message text,
    status text DEFAULT 'pending'::text NOT NULL,
    auto_reason text,
    decided_by text,
    decided_by_user text,
    decision_note text,
    decided_at timestamp with time zone,
    refund_status text DEFAULT 'none'::text NOT NULL,
    refund_id uuid,
    amount_cents integer,
    gateway_method text,
    gateway_response text,
    attempts integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT guide_refund_request_reason_check CHECK ((reason = ANY (ARRAY['duplicate'::text, 'broken'::text, 'not_as_described'::text, 'unopened'::text, 'other'::text]))),
    CONSTRAINT guide_refund_request_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'auto_approved'::text, 'denied'::text])))
);


--
-- Name: invoice_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.invoice_seq
    START WITH 1000
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: legacy_arb; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.legacy_arb (
    arb_id text NOT NULL,
    arb_status text,
    name text,
    amount_cents integer,
    interval_length smallint,
    interval_unit text,
    start_date date,
    total_occurrences integer,
    customer_profile_id text,
    payment_profile_id text,
    card_last_four text,
    card_type text,
    card_expiration text,
    profile_email text,
    pay_count integer,
    last_approved_at timestamp with time zone,
    last_approved_trans_id text,
    last_declined_at timestamp with time zone,
    next_billing_date timestamp with time zone,
    user_id text,
    match_method text,
    classification text,
    flags text[] DEFAULT '{}'::text[] NOT NULL,
    decision text,
    decided_by text,
    decided_at timestamp with time zone,
    user_before jsonb,
    charges_after_cancel jsonb,
    raw jsonb,
    scanned_at timestamp with time zone DEFAULT now() NOT NULL,
    subscription_id uuid,
    migrated_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    error text
);


--
-- Name: lss_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lss_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    start_date timestamp with time zone NOT NULL,
    end_date timestamp with time zone NOT NULL,
    event_type text,
    format text,
    link text,
    is_active boolean DEFAULT true,
    created_by text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: matches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.matches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id text,
    month text,
    year text,
    circuit text,
    round integer NOT NULL,
    "table" integer,
    player1_gem_id text,
    player1_name text NOT NULL,
    player2_gem_id text,
    player2_name text NOT NULL,
    winner text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: member_event; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.member_event (
    id bigint NOT NULL,
    user_id text,
    kind text NOT NULL,
    subscription_id text,
    subscription_type text,
    reason text,
    actor_id text,
    at timestamp with time zone DEFAULT now() NOT NULL,
    meta jsonb
);


--
-- Name: member_event_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.member_event_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: member_event_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.member_event_id_seq OWNED BY public.member_event.id;


--
-- Name: member_referral; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.member_referral (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    referrer_user_id text NOT NULL,
    referred_user_id text NOT NULL,
    code text NOT NULL,
    subscription_type text NOT NULL,
    status text DEFAULT 'pending'::text,
    reward_earned_at timestamp with time zone,
    reward_applied_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    subscription_id uuid,
    qualifying_trans_id text,
    reward_subscription_id uuid,
    reward_note text
);


--
-- Name: member_referral_code; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.member_referral_code (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    code text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: notification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    kind text NOT NULL,
    course_id uuid,
    lesson_id uuid,
    post_id uuid,
    actor_id text,
    data jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    read_at timestamp with time zone
);


--
-- Name: order; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."order" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider text NOT NULL,
    provider_ref text NOT NULL,
    user_email text,
    amount text,
    currency text,
    meta jsonb,
    created_at timestamp with time zone DEFAULT now(),
    refunded_at timestamp with time zone,
    user_id text,
    kind text,
    refunded_amount numeric(10,2) DEFAULT 0 NOT NULL,
    checkout_id uuid
);


--
-- Name: partner; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partner (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    code text NOT NULL,
    is_active boolean DEFAULT true,
    payout_notes text,
    created_at timestamp with time zone DEFAULT now(),
    created_by text,
    display_name text
);


--
-- Name: partner_account; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partner_account (
    teacher_id text NOT NULL,
    lifetime_copies integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT partner_account_lifetime_copies_check CHECK ((lifetime_copies >= 0))
);


--
-- Name: partner_attribution; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partner_attribution (
    referred_user_id text NOT NULL,
    teacher_id text NOT NULL,
    partner_id uuid,
    source text NOT NULL,
    code text,
    subscription_id uuid,
    status text DEFAULT 'pending'::text NOT NULL,
    void_reason text,
    attributed_at timestamp with time zone DEFAULT now() NOT NULL,
    decided_at timestamp with time zone,
    CONSTRAINT partner_attribution_check CHECK ((referred_user_id <> teacher_id))
);


--
-- Name: partner_ledger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partner_ledger (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entry_type text NOT NULL,
    status text NOT NULL,
    teacher_id text NOT NULL,
    order_id uuid,
    checkout_item_id uuid,
    course_id uuid,
    buyer_id text,
    reverses_id uuid,
    legacy_sale_id uuid,
    referred_user_id text,
    pool_month date,
    list_cents integer DEFAULT 0 NOT NULL,
    buyer_type text,
    member_discount_cents integer DEFAULT 0 NOT NULL,
    buyer_paid_cents integer DEFAULT 0 NOT NULL,
    card_fee_cents integer DEFAULT 0 NOT NULL,
    share_rate numeric(5,4),
    level text,
    copy_number integer,
    teacher_cents integer NOT NULL,
    age_commission_cents integer DEFAULT 0 NOT NULL,
    age_net_cents integer DEFAULT 0 NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    payable_at timestamp with time zone DEFAULT now() NOT NULL,
    statement_month date NOT NULL,
    settled_payout_id uuid,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    settled_at timestamp with time zone,
    CONSTRAINT partner_ledger_status_check CHECK ((status = ANY (ARRAY['paid'::text, 'refunded'::text, 'charged_back'::text, 'earned'::text, 'void'::text]))),
    CONSTRAINT partner_ledger_type_check CHECK ((entry_type = ANY (ARRAY['sale'::text, 'reversal'::text, 'referral_bonus'::text, 'pool_share'::text, 'adjustment'::text, 'age_cost'::text])))
);


--
-- Name: partner_referral; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partner_referral (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    partner_id uuid NOT NULL,
    referred_user_id text NOT NULL,
    code text NOT NULL,
    subscription_type text NOT NULL,
    discount_amount numeric(10,2) NOT NULL,
    commission_amount numeric(10,2) NOT NULL,
    first_charge_order_id uuid,
    payout_status text DEFAULT 'pending'::text,
    paid_at timestamp with time zone,
    paid_notes text,
    created_at timestamp with time zone DEFAULT now(),
    subscription_id uuid,
    voided_at timestamp with time zone,
    void_reason text
);


--
-- Name: partner_statement; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partner_statement (
    teacher_id text NOT NULL,
    month date NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    amount_cents integer,
    payout_id uuid,
    reference text,
    note text,
    paid_at timestamp with time zone,
    paid_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT partner_statement_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text])))
);


--
-- Name: password_reset_token; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_token (
    id text NOT NULL,
    user_id text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: payment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment (
    id bigint NOT NULL,
    provider text DEFAULT 'authnet'::text NOT NULL,
    trans_id text NOT NULL,
    kind text NOT NULL,
    user_id text,
    user_email text,
    subscription_id text,
    subscription_type text,
    pay_num integer,
    order_id uuid,
    ticket_id uuid,
    event_id text,
    amount numeric(10,2) NOT NULL,
    list_amount numeric(10,2),
    discount_amount numeric(10,2) DEFAULT 0 NOT NULL,
    discount_kind text,
    promo_code text,
    occurred_at timestamp with time zone NOT NULL,
    refunded_amount numeric(10,2) DEFAULT 0 NOT NULL,
    refunded_at timestamp with time zone,
    source text NOT NULL,
    verified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: payment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payment_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payment_id_seq OWNED BY public.payment.id;


--
-- Name: pool_run; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pool_run (
    month date NOT NULL,
    status text NOT NULL,
    reason text,
    active_members integer,
    net_revenue_cents integer,
    pool_cents integer,
    total_reads integer,
    ran_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: refund; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refund (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trans_id text NOT NULL,
    amount_cents integer NOT NULL,
    method text,
    status text NOT NULL,
    refund_trans_id text,
    invoice_number text,
    reason text,
    requested_by text,
    order_id uuid,
    ticket_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    subscription_invoice_id uuid,
    subscription_effect text,
    refund_request_id uuid,
    last_error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    checkout_item_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    guide_refund_request_id uuid
);


--
-- Name: refund_request; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refund_request (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    user_id text NOT NULL,
    reason text,
    status text DEFAULT 'pending'::text NOT NULL,
    decided_by text,
    decided_at timestamp with time zone,
    decision_note text,
    refund_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: roadmap_item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roadmap_item (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    body text,
    stage text DEFAULT 'upcoming'::text NOT NULL,
    area text,
    "position" integer DEFAULT 0 NOT NULL,
    is_public boolean DEFAULT true NOT NULL,
    shipped_at timestamp with time zone,
    created_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT roadmap_item_stage_check CHECK ((stage = ANY (ARRAY['upcoming'::text, 'development'::text, 'testing'::text, 'shipped'::text])))
);


--
-- Name: saved_card; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.saved_card (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    customer_profile_id text NOT NULL,
    payment_profile_id text NOT NULL,
    card_type text NOT NULL,
    last_four text NOT NULL,
    expiration_month text NOT NULL,
    expiration_year text NOT NULL,
    is_default boolean DEFAULT false,
    nickname text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    status text DEFAULT 'active'::text NOT NULL,
    exp_month smallint,
    exp_year smallint,
    deleted_at timestamp with time zone,
    verified_at timestamp with time zone,
    source text,
    environment text
);


--
-- Name: session; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.session (
    id text NOT NULL,
    user_id text NOT NULL,
    expires_at timestamp with time zone NOT NULL
);


--
-- Name: staff_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    event_id text NOT NULL,
    assigned_by text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: standings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.standings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    season text NOT NULL,
    circuit text NOT NULL,
    gem_id text,
    player_name text NOT NULL,
    total_points integer DEFAULT 0,
    win_percentage numeric(5,2),
    matches_played integer DEFAULT 0,
    matches_won integer DEFAULT 0,
    qualified_for_championship boolean DEFAULT false,
    january_points integer DEFAULT 0,
    february_points integer DEFAULT 0,
    march_points integer DEFAULT 0,
    april_points integer DEFAULT 0,
    may_points integer DEFAULT 0,
    june_points integer DEFAULT 0,
    july_points integer DEFAULT 0,
    august_points integer DEFAULT 0,
    september_points integer DEFAULT 0,
    october_points integer DEFAULT 0,
    november_points integer DEFAULT 0,
    december_points integer DEFAULT 0,
    january_matches_won integer DEFAULT 0,
    february_matches_won integer DEFAULT 0,
    march_matches_won integer DEFAULT 0,
    april_matches_won integer DEFAULT 0,
    may_matches_won integer DEFAULT 0,
    june_matches_won integer DEFAULT 0,
    july_matches_won integer DEFAULT 0,
    august_matches_won integer DEFAULT 0,
    september_matches_won integer DEFAULT 0,
    october_matches_won integer DEFAULT 0,
    november_matches_won integer DEFAULT 0,
    december_matches_won integer DEFAULT 0,
    january_matches integer DEFAULT 0,
    february_matches integer DEFAULT 0,
    march_matches integer DEFAULT 0,
    april_matches integer DEFAULT 0,
    may_matches integer DEFAULT 0,
    june_matches integer DEFAULT 0,
    july_matches integer DEFAULT 0,
    august_matches integer DEFAULT 0,
    september_matches integer DEFAULT 0,
    october_matches integer DEFAULT 0,
    november_matches integer DEFAULT 0,
    december_matches integer DEFAULT 0,
    updated_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: status_check; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.status_check (
    id bigint NOT NULL,
    component text NOT NULL,
    ok boolean NOT NULL,
    ms integer,
    note text,
    at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: status_check_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.status_check_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: status_check_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.status_check_id_seq OWNED BY public.status_check.id;


--
-- Name: status_incident; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.status_incident (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kind text DEFAULT 'incident'::text NOT NULL,
    title text NOT NULL,
    impact text DEFAULT 'minor'::text NOT NULL,
    components text[] DEFAULT ARRAY[]::text[] NOT NULL,
    status text DEFAULT 'investigating'::text NOT NULL,
    starts_at timestamp with time zone DEFAULT now() NOT NULL,
    ends_at timestamp with time zone,
    resolved_at timestamp with time zone,
    banner boolean DEFAULT true NOT NULL,
    created_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT status_incident_impact_check CHECK ((impact = ANY (ARRAY['minor'::text, 'major'::text, 'maintenance'::text]))),
    CONSTRAINT status_incident_kind_check CHECK ((kind = ANY (ARRAY['incident'::text, 'maintenance'::text])))
);


--
-- Name: status_update; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.status_update (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    incident_id uuid NOT NULL,
    status text NOT NULL,
    body text NOT NULL,
    created_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: store; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    circuit_id uuid NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    address text,
    city text,
    state text,
    website text,
    phone text,
    contact_email text,
    revenue_share numeric(5,4),
    active boolean DEFAULT true NOT NULL,
    created_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT store_revenue_share_check CHECK (((revenue_share IS NULL) OR ((revenue_share >= (0)::numeric) AND (revenue_share <= (1)::numeric))))
);


--
-- Name: store_activity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_activity (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    actor_id text,
    kind text NOT NULL,
    event_id text,
    note text,
    data jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: store_ledger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_ledger (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    entry_type text NOT NULL,
    event_id text,
    ticket_id uuid,
    gross_cents integer DEFAULT 0 NOT NULL,
    fee_cents integer DEFAULT 0 NOT NULL,
    share_rate numeric(5,4),
    store_cents integer NOT NULL,
    age_cents integer DEFAULT 0 NOT NULL,
    statement_month date NOT NULL,
    note text,
    created_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    payout_id uuid,
    CONSTRAINT store_ledger_entry_type_check CHECK ((entry_type = ANY (ARRAY['sale'::text, 'refund'::text, 'adjustment'::text])))
);


--
-- Name: store_member; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_member (
    store_id uuid NOT NULL,
    user_id text NOT NULL,
    role text DEFAULT 'manager'::text NOT NULL,
    added_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT store_member_role_check CHECK ((role = ANY (ARRAY['owner'::text, 'manager'::text])))
);


--
-- Name: store_payout; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_payout (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    event_id text,
    status text DEFAULT 'open'::text NOT NULL,
    gross_cents integer,
    refund_cents integer,
    fee_cents integer,
    adjust_cents integer,
    carried_cents integer,
    amount_cents integer,
    paid_at timestamp with time zone,
    paid_by text,
    method text,
    reference text,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT store_payout_status_check CHECK ((status = ANY (ARRAY['open'::text, 'paid'::text])))
);


--
-- Name: store_program; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_program (
    id integer DEFAULT 1 NOT NULL,
    default_share numeric(5,4),
    fee_payer text DEFAULT 'age'::text NOT NULL,
    updated_by text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    fee_pct numeric(6,4) DEFAULT 0.0290 NOT NULL,
    fee_fixed_cents integer DEFAULT 30 NOT NULL,
    CONSTRAINT store_program_default_share_check CHECK (((default_share IS NULL) OR ((default_share >= (0)::numeric) AND (default_share <= (1)::numeric)))),
    CONSTRAINT store_program_fee_fixed_cents_check CHECK ((fee_fixed_cents >= 0)),
    CONSTRAINT store_program_fee_payer_check CHECK ((fee_payer = ANY (ARRAY['age'::text, 'store'::text]))),
    CONSTRAINT store_program_fee_pct_check CHECK (((fee_pct >= (0)::numeric) AND (fee_pct < (1)::numeric))),
    CONSTRAINT store_program_id_check CHECK ((id = 1))
);


--
-- Name: studio_channel; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.studio_channel (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    kind text DEFAULT 'video'::text NOT NULL,
    youtube_channel_id text NOT NULL,
    youtube_url text NOT NULL,
    handle text,
    avatar_url text,
    banner_url text,
    description text,
    cover_image_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    last_synced_at timestamp with time zone,
    sync_error text,
    created_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT studio_channel_kind_check CHECK ((kind = ANY (ARRAY['podcast'::text, 'video'::text])))
);


--
-- Name: studio_channel_video; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.studio_channel_video (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    channel_id uuid NOT NULL,
    youtube_video_id text NOT NULL,
    title text NOT NULL,
    description text,
    published_at timestamp with time zone,
    thumbnail_url text,
    duration integer,
    is_short boolean DEFAULT false NOT NULL,
    is_available boolean DEFAULT true NOT NULL,
    is_featured boolean DEFAULT false NOT NULL,
    featured_at timestamp with time zone,
    featured_by text,
    sort_order integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: studio_project; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.studio_project (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    dek text,
    type text DEFAULT 'interactive'::text NOT NULL,
    cover_image_id uuid,
    href text,
    is_premium boolean DEFAULT false NOT NULL,
    is_featured boolean DEFAULT false NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    published_at timestamp with time zone,
    sort_order integer DEFAULT 0 NOT NULL,
    created_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT studio_project_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text]))),
    CONSTRAINT studio_project_type_check CHECK ((type = ANY (ARRAY['interactive'::text, 'stats'::text, 'software'::text, 'film'::text, 'feature'::text])))
);


--
-- Name: studio_show; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.studio_show (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    kind text DEFAULT 'podcast'::text NOT NULL,
    description text,
    host text,
    cover_image_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT studio_show_kind_check CHECK ((kind = ANY (ARRAY['podcast'::text, 'interview'::text, 'video'::text])))
);


--
-- Name: subscription; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ref text NOT NULL,
    user_id text NOT NULL,
    plan text NOT NULL,
    price_cents integer NOT NULL,
    anchor_day smallint NOT NULL,
    status text NOT NULL,
    started_at timestamp with time zone,
    current_period_start timestamp with time zone,
    current_period_end timestamp with time zone,
    next_charge_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    ended_at timestamp with time zone,
    end_reason text,
    customer_profile_id text,
    payment_profile_id text,
    saved_card_id uuid,
    failed_attempts smallint DEFAULT 0 NOT NULL,
    first_failed_at timestamp with time zone,
    next_attempt_at timestamp with time zone,
    grace_until timestamp with time zone,
    pending_plan text,
    pending_price_cents integer,
    promo_code text,
    promo_kind text,
    partner_referral_id uuid,
    member_referral_id uuid,
    network_trans_id text,
    legacy_arb_id text,
    legacy_arb_cancelled_at timestamp with time zone,
    migrated_at timestamp with time zone,
    hold boolean DEFAULT false NOT NULL,
    lease_until timestamp with time zone,
    lease_token text,
    flags text[] DEFAULT '{}'::text[] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: subscription_invoice; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription_invoice (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subscription_id uuid NOT NULL,
    seq integer NOT NULL,
    kind text NOT NULL,
    plan text,
    period_start timestamp with time zone NOT NULL,
    period_end timestamp with time zone NOT NULL,
    list_cents integer NOT NULL,
    discount_cents integer DEFAULT 0 NOT NULL,
    amount_cents integer NOT NULL,
    status text NOT NULL,
    invoice_number text,
    attempts smallint DEFAULT 0 NOT NULL,
    last_attempt_at timestamp with time zone,
    last_error text,
    trans_id text,
    network_trans_id text,
    paid_at timestamp with time zone,
    order_id uuid,
    refunded_cents integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: teacher_payout; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teacher_payout (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    teacher_id text NOT NULL,
    pay_date date NOT NULL,
    amount_cents integer NOT NULL,
    sale_count integer NOT NULL,
    status text DEFAULT 'paid'::text NOT NULL,
    paid_at timestamp with time zone DEFAULT now() NOT NULL,
    paid_by text,
    reference text,
    note text
);


--
-- Name: ticket; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ticket (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text,
    event_id text NOT NULL,
    order_id uuid,
    code text NOT NULL,
    quantity integer DEFAULT 1,
    first_name text,
    last_name text,
    gem_id text,
    amount_paid numeric(10,2),
    transaction_id text,
    refunded boolean DEFAULT false,
    refunded_at timestamp with time zone,
    entered_into_gem boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    voided_at timestamp with time zone,
    checkout_id uuid
);


--
-- Name: user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."user" (
    id text NOT NULL,
    email text NOT NULL,
    hashed_password text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    gem_id text,
    role text DEFAULT 'free'::text NOT NULL,
    customer_profile_id text,
    subscription_id text,
    subscription_type text,
    subscription_status text,
    subscription_start_date timestamp with time zone,
    subscription_end_date timestamp with time zone,
    next_billing_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    used_partner_code text,
    additional_roles text[] DEFAULT ARRAY[]::text[] NOT NULL,
    comp_reason text,
    comped_at timestamp with time zone,
    comped_by text,
    last_subscription_id text,
    comp_ends_at timestamp with time zone
);


--
-- Name: vods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mux_asset_id text,
    mux_playback_id text,
    mux_upload_id text,
    title text NOT NULL,
    description text,
    thumbnail text,
    duration real,
    aspect_ratio text,
    event_id text,
    is_premium boolean DEFAULT true,
    status text DEFAULT 'waiting'::text,
    is_published boolean DEFAULT false,
    published_at timestamp with time zone,
    created_by text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    player1_name text,
    player1_hero text,
    player2_name text,
    player2_hero text,
    cover_image_id uuid,
    kind text DEFAULT 'gameplay'::text NOT NULL,
    media_type text DEFAULT 'video'::text NOT NULL,
    show_id uuid,
    guests text,
    season integer,
    episode_number integer,
    round text,
    CONSTRAINT vods_kind_check CHECK ((kind = ANY (ARRAY['gameplay'::text, 'podcast'::text, 'interview'::text, 'video'::text]))),
    CONSTRAINT vods_media_type_check CHECK ((media_type = ANY (ARRAY['video'::text, 'audio'::text])))
);


--
-- Name: webhook_event; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webhook_event (
    id text NOT NULL,
    provider text NOT NULL,
    received_at timestamp with time zone DEFAULT now()
);


--
-- Name: billing_notice id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_notice ALTER COLUMN id SET DEFAULT nextval('public.billing_notice_id_seq'::regclass);


--
-- Name: billing_run id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_run ALTER COLUMN id SET DEFAULT nextval('public.billing_run_id_seq'::regclass);


--
-- Name: ca_conversion id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ca_conversion ALTER COLUMN id SET DEFAULT nextval('public.ca_conversion_id_seq'::regclass);


--
-- Name: ca_event id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ca_event ALTER COLUMN id SET DEFAULT nextval('public.ca_event_id_seq'::regclass);


--
-- Name: member_event id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_event ALTER COLUMN id SET DEFAULT nextval('public.member_event_id_seq'::regclass);


--
-- Name: payment id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment ALTER COLUMN id SET DEFAULT nextval('public.payment_id_seq'::regclass);


--
-- Name: status_check id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.status_check ALTER COLUMN id SET DEFAULT nextval('public.status_check_id_seq'::regclass);


--
-- Name: billing_notice billing_notice_kind_ref_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_notice
    ADD CONSTRAINT billing_notice_kind_ref_key UNIQUE (kind, ref);


--
-- Name: billing_notice billing_notice_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_notice
    ADD CONSTRAINT billing_notice_pkey PRIMARY KEY (id);


--
-- Name: billing_run billing_run_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_run
    ADD CONSTRAINT billing_run_pkey PRIMARY KEY (id);


--
-- Name: ca_conversion ca_conversion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ca_conversion
    ADD CONSTRAINT ca_conversion_pkey PRIMARY KEY (id);


--
-- Name: ca_event ca_event_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ca_event
    ADD CONSTRAINT ca_event_pkey PRIMARY KEY (id);


--
-- Name: ca_pageview ca_pageview_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ca_pageview
    ADD CONSTRAINT ca_pageview_pkey PRIMARY KEY (id);


--
-- Name: ca_view ca_view_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ca_view
    ADD CONSTRAINT ca_view_pkey PRIMARY KEY (id);


--
-- Name: checkout checkout_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkout
    ADD CONSTRAINT checkout_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: checkout checkout_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkout
    ADD CONSTRAINT checkout_invoice_number_key UNIQUE (invoice_number);


--
-- Name: checkout_item checkout_item_checkout_id_course_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkout_item
    ADD CONSTRAINT checkout_item_checkout_id_course_id_key UNIQUE (checkout_id, course_id);


--
-- Name: checkout_item checkout_item_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkout_item
    ADD CONSTRAINT checkout_item_pkey PRIMARY KEY (id);


--
-- Name: checkout checkout_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkout
    ADD CONSTRAINT checkout_pkey PRIMARY KEY (id);


--
-- Name: checkout checkout_trans_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkout
    ADD CONSTRAINT checkout_trans_id_key UNIQUE (trans_id);


--
-- Name: circuit circuit_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.circuit
    ADD CONSTRAINT circuit_name_key UNIQUE (name);


--
-- Name: circuit circuit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.circuit
    ADD CONSTRAINT circuit_pkey PRIMARY KEY (id);


--
-- Name: circuit circuit_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.circuit
    ADD CONSTRAINT circuit_slug_key UNIQUE (slug);


--
-- Name: cms_author_profile cms_author_profile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_author_profile
    ADD CONSTRAINT cms_author_profile_pkey PRIMARY KEY (user_id);


--
-- Name: cms_course cms_course_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_course
    ADD CONSTRAINT cms_course_pkey PRIMARY KEY (id);


--
-- Name: cms_course cms_course_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_course
    ADD CONSTRAINT cms_course_slug_key UNIQUE (slug);


--
-- Name: cms_entry cms_entry_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_entry
    ADD CONSTRAINT cms_entry_pkey PRIMARY KEY (id);


--
-- Name: cms_entry cms_entry_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_entry
    ADD CONSTRAINT cms_entry_slug_key UNIQUE (slug);


--
-- Name: cms_entry_tag cms_entry_tag_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_entry_tag
    ADD CONSTRAINT cms_entry_tag_pkey PRIMARY KEY (entry_id, tag_id);


--
-- Name: cms_lesson cms_lesson_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_lesson
    ADD CONSTRAINT cms_lesson_pkey PRIMARY KEY (id);


--
-- Name: cms_lesson_progress cms_lesson_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_lesson_progress
    ADD CONSTRAINT cms_lesson_progress_pkey PRIMARY KEY (id);


--
-- Name: cms_media cms_media_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_media
    ADD CONSTRAINT cms_media_pkey PRIMARY KEY (id);


--
-- Name: cms_module cms_module_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_module
    ADD CONSTRAINT cms_module_pkey PRIMARY KEY (id);


--
-- Name: cms_revision cms_revision_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_revision
    ADD CONSTRAINT cms_revision_pkey PRIMARY KEY (id);


--
-- Name: cms_tag cms_tag_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_tag
    ADD CONSTRAINT cms_tag_pkey PRIMARY KEY (id);


--
-- Name: cms_tag cms_tag_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_tag
    ADD CONSTRAINT cms_tag_slug_key UNIQUE (slug);


--
-- Name: contact_message contact_message_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_message
    ADD CONSTRAINT contact_message_pkey PRIMARY KEY (id);


--
-- Name: contact_thread contact_thread_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_thread
    ADD CONSTRAINT contact_thread_pkey PRIMARY KEY (id);


--
-- Name: contact_thread contact_thread_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_thread
    ADD CONSTRAINT contact_thread_token_key UNIQUE (token);


--
-- Name: course_activity course_activity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_activity
    ADD CONSTRAINT course_activity_pkey PRIMARY KEY (id);


--
-- Name: course_changelog course_changelog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_changelog
    ADD CONSTRAINT course_changelog_pkey PRIMARY KEY (id);


--
-- Name: course_enrollment course_enrollment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_enrollment
    ADD CONSTRAINT course_enrollment_pkey PRIMARY KEY (id);


--
-- Name: course_post course_post_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_post
    ADD CONSTRAINT course_post_pkey PRIMARY KEY (id);


--
-- Name: course_post_report course_post_report_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_post_report
    ADD CONSTRAINT course_post_report_pkey PRIMARY KEY (id);


--
-- Name: course_post_report course_post_report_post_id_reporter_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_post_report
    ADD CONSTRAINT course_post_report_post_id_reporter_id_key UNIQUE (post_id, reporter_id);


--
-- Name: course_sale course_sale_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_sale
    ADD CONSTRAINT course_sale_pkey PRIMARY KEY (id);


--
-- Name: course_sale course_sale_trans_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_sale
    ADD CONSTRAINT course_sale_trans_id_key UNIQUE (trans_id);


--
-- Name: decklists decklists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.decklists
    ADD CONSTRAINT decklists_pkey PRIMARY KEY (id);


--
-- Name: event_player_heroes event_player_heroes_event_id_gem_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_player_heroes
    ADD CONSTRAINT event_player_heroes_event_id_gem_id_unique UNIQUE (event_id, gem_id);


--
-- Name: event_player_heroes event_player_heroes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_player_heroes
    ADD CONSTRAINT event_player_heroes_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: fab_card_lookup fab_card_lookup_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fab_card_lookup
    ADD CONSTRAINT fab_card_lookup_pkey PRIMARY KEY (lookup_key);


--
-- Name: guide_read guide_read_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guide_read
    ADD CONSTRAINT guide_read_pkey PRIMARY KEY (user_id, course_id, month);


--
-- Name: guide_refund_request guide_refund_request_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guide_refund_request
    ADD CONSTRAINT guide_refund_request_pkey PRIMARY KEY (id);


--
-- Name: legacy_arb legacy_arb_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legacy_arb
    ADD CONSTRAINT legacy_arb_pkey PRIMARY KEY (arb_id);


--
-- Name: lss_events lss_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lss_events
    ADD CONSTRAINT lss_events_pkey PRIMARY KEY (id);


--
-- Name: matches matches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_pkey PRIMARY KEY (id);


--
-- Name: member_event member_event_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_event
    ADD CONSTRAINT member_event_pkey PRIMARY KEY (id);


--
-- Name: member_referral_code member_referral_code_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_referral_code
    ADD CONSTRAINT member_referral_code_code_key UNIQUE (code);


--
-- Name: member_referral_code member_referral_code_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_referral_code
    ADD CONSTRAINT member_referral_code_pkey PRIMARY KEY (id);


--
-- Name: member_referral_code member_referral_code_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_referral_code
    ADD CONSTRAINT member_referral_code_user_id_key UNIQUE (user_id);


--
-- Name: member_referral member_referral_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_referral
    ADD CONSTRAINT member_referral_pkey PRIMARY KEY (id);


--
-- Name: notification notification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification
    ADD CONSTRAINT notification_pkey PRIMARY KEY (id);


--
-- Name: order order_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."order"
    ADD CONSTRAINT order_pkey PRIMARY KEY (id);


--
-- Name: partner_account partner_account_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_account
    ADD CONSTRAINT partner_account_pkey PRIMARY KEY (teacher_id);


--
-- Name: partner_attribution partner_attribution_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_attribution
    ADD CONSTRAINT partner_attribution_pkey PRIMARY KEY (referred_user_id);


--
-- Name: partner partner_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner
    ADD CONSTRAINT partner_code_key UNIQUE (code);


--
-- Name: partner_ledger partner_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_ledger
    ADD CONSTRAINT partner_ledger_pkey PRIMARY KEY (id);


--
-- Name: partner partner_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner
    ADD CONSTRAINT partner_pkey PRIMARY KEY (id);


--
-- Name: partner_referral partner_referral_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_referral
    ADD CONSTRAINT partner_referral_pkey PRIMARY KEY (id);


--
-- Name: partner_statement partner_statement_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_statement
    ADD CONSTRAINT partner_statement_pkey PRIMARY KEY (teacher_id, month);


--
-- Name: partner partner_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner
    ADD CONSTRAINT partner_user_id_key UNIQUE (user_id);


--
-- Name: password_reset_token password_reset_token_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_token
    ADD CONSTRAINT password_reset_token_pkey PRIMARY KEY (id);


--
-- Name: payment payment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment
    ADD CONSTRAINT payment_pkey PRIMARY KEY (id);


--
-- Name: payment payment_trans_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment
    ADD CONSTRAINT payment_trans_id_key UNIQUE (trans_id);


--
-- Name: pool_run pool_run_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pool_run
    ADD CONSTRAINT pool_run_pkey PRIMARY KEY (month);


--
-- Name: refund refund_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refund
    ADD CONSTRAINT refund_pkey PRIMARY KEY (id);


--
-- Name: refund_request refund_request_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refund_request
    ADD CONSTRAINT refund_request_pkey PRIMARY KEY (id);


--
-- Name: roadmap_item roadmap_item_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_item
    ADD CONSTRAINT roadmap_item_pkey PRIMARY KEY (id);


--
-- Name: saved_card saved_card_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_card
    ADD CONSTRAINT saved_card_pkey PRIMARY KEY (id);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (id);


--
-- Name: staff_assignments staff_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_assignments
    ADD CONSTRAINT staff_assignments_pkey PRIMARY KEY (id);


--
-- Name: standings standings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.standings
    ADD CONSTRAINT standings_pkey PRIMARY KEY (id);


--
-- Name: status_check status_check_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.status_check
    ADD CONSTRAINT status_check_pkey PRIMARY KEY (id);


--
-- Name: status_incident status_incident_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.status_incident
    ADD CONSTRAINT status_incident_pkey PRIMARY KEY (id);


--
-- Name: status_update status_update_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.status_update
    ADD CONSTRAINT status_update_pkey PRIMARY KEY (id);


--
-- Name: store_activity store_activity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_activity
    ADD CONSTRAINT store_activity_pkey PRIMARY KEY (id);


--
-- Name: store_ledger store_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_ledger
    ADD CONSTRAINT store_ledger_pkey PRIMARY KEY (id);


--
-- Name: store_member store_member_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_member
    ADD CONSTRAINT store_member_pkey PRIMARY KEY (store_id, user_id);


--
-- Name: store_payout store_payout_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_payout
    ADD CONSTRAINT store_payout_pkey PRIMARY KEY (id);


--
-- Name: store store_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store
    ADD CONSTRAINT store_pkey PRIMARY KEY (id);


--
-- Name: store_program store_program_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_program
    ADD CONSTRAINT store_program_pkey PRIMARY KEY (id);


--
-- Name: store store_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store
    ADD CONSTRAINT store_slug_key UNIQUE (slug);


--
-- Name: studio_channel studio_channel_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_channel
    ADD CONSTRAINT studio_channel_pkey PRIMARY KEY (id);


--
-- Name: studio_channel studio_channel_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_channel
    ADD CONSTRAINT studio_channel_slug_key UNIQUE (slug);


--
-- Name: studio_channel_video studio_channel_video_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_channel_video
    ADD CONSTRAINT studio_channel_video_pkey PRIMARY KEY (id);


--
-- Name: studio_channel_video studio_channel_video_youtube_video_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_channel_video
    ADD CONSTRAINT studio_channel_video_youtube_video_id_key UNIQUE (youtube_video_id);


--
-- Name: studio_channel studio_channel_youtube_channel_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_channel
    ADD CONSTRAINT studio_channel_youtube_channel_id_key UNIQUE (youtube_channel_id);


--
-- Name: studio_project studio_project_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_project
    ADD CONSTRAINT studio_project_pkey PRIMARY KEY (id);


--
-- Name: studio_project studio_project_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_project
    ADD CONSTRAINT studio_project_slug_key UNIQUE (slug);


--
-- Name: studio_show studio_show_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_show
    ADD CONSTRAINT studio_show_pkey PRIMARY KEY (id);


--
-- Name: studio_show studio_show_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_show
    ADD CONSTRAINT studio_show_slug_key UNIQUE (slug);


--
-- Name: subscription_invoice subscription_invoice_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_invoice
    ADD CONSTRAINT subscription_invoice_invoice_number_key UNIQUE (invoice_number);


--
-- Name: subscription_invoice subscription_invoice_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_invoice
    ADD CONSTRAINT subscription_invoice_pkey PRIMARY KEY (id);


--
-- Name: subscription_invoice subscription_invoice_subscription_id_period_start_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_invoice
    ADD CONSTRAINT subscription_invoice_subscription_id_period_start_key UNIQUE (subscription_id, period_start);


--
-- Name: subscription_invoice subscription_invoice_trans_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_invoice
    ADD CONSTRAINT subscription_invoice_trans_id_key UNIQUE (trans_id);


--
-- Name: subscription subscription_legacy_arb_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription
    ADD CONSTRAINT subscription_legacy_arb_id_key UNIQUE (legacy_arb_id);


--
-- Name: subscription subscription_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription
    ADD CONSTRAINT subscription_pkey PRIMARY KEY (id);


--
-- Name: subscription subscription_ref_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription
    ADD CONSTRAINT subscription_ref_key UNIQUE (ref);


--
-- Name: teacher_payout teacher_payout_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_payout
    ADD CONSTRAINT teacher_payout_pkey PRIMARY KEY (id);


--
-- Name: ticket ticket_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket
    ADD CONSTRAINT ticket_pkey PRIMARY KEY (id);


--
-- Name: user user_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_email_unique UNIQUE (email);


--
-- Name: user user_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);


--
-- Name: vods vods_mux_asset_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vods
    ADD CONSTRAINT vods_mux_asset_id_key UNIQUE (mux_asset_id);


--
-- Name: vods vods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vods
    ADD CONSTRAINT vods_pkey PRIMARY KEY (id);


--
-- Name: webhook_event webhook_event_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_event
    ADD CONSTRAINT webhook_event_pkey PRIMARY KEY (id);


--
-- Name: ca_conversion_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ca_conversion_at_idx ON public.ca_conversion USING btree (at);


--
-- Name: ca_conversion_session_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ca_conversion_session_idx ON public.ca_conversion USING btree (session_id);


--
-- Name: ca_conversion_visitor_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ca_conversion_visitor_idx ON public.ca_conversion USING btree (visitor_id);


--
-- Name: ca_event_course_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ca_event_course_idx ON public.ca_event USING btree (course_id) WHERE (course_id IS NOT NULL);


--
-- Name: ca_event_entry_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ca_event_entry_at_idx ON public.ca_event USING btree (entry_id, at);


--
-- Name: ca_event_view_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ca_event_view_idx ON public.ca_event USING btree (view_id);


--
-- Name: ca_event_vod_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ca_event_vod_idx ON public.ca_event USING btree (vod_id) WHERE (vod_id IS NOT NULL);


--
-- Name: ca_pageview_path_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ca_pageview_path_idx ON public.ca_pageview USING btree (path, started_at);


--
-- Name: ca_pageview_session_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ca_pageview_session_idx ON public.ca_pageview USING btree (session_id, started_at);


--
-- Name: ca_pageview_started_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ca_pageview_started_idx ON public.ca_pageview USING btree (started_at);


--
-- Name: ca_pageview_visitor_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ca_pageview_visitor_idx ON public.ca_pageview USING btree (visitor_id, started_at);


--
-- Name: ca_view_course_started_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ca_view_course_started_idx ON public.ca_view USING btree (course_id, started_at) WHERE (course_id IS NOT NULL);


--
-- Name: ca_view_entry_started_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ca_view_entry_started_idx ON public.ca_view USING btree (entry_id, started_at);


--
-- Name: ca_view_lesson_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ca_view_lesson_idx ON public.ca_view USING btree (lesson_id) WHERE (lesson_id IS NOT NULL);


--
-- Name: ca_view_started_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ca_view_started_idx ON public.ca_view USING btree (started_at);


--
-- Name: ca_view_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ca_view_user_idx ON public.ca_view USING btree (user_id, started_at);


--
-- Name: ca_view_visitor_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ca_view_visitor_idx ON public.ca_view USING btree (visitor_id, started_at);


--
-- Name: ca_view_vod_started_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ca_view_vod_started_idx ON public.ca_view USING btree (vod_id, started_at) WHERE (vod_id IS NOT NULL);


--
-- Name: checkout_course_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX checkout_course_idx ON public.checkout USING btree (course_id) WHERE (course_id IS NOT NULL);


--
-- Name: checkout_event_live_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX checkout_event_live_idx ON public.checkout USING btree (event_id, created_at) WHERE (status = ANY (ARRAY['pending'::text, 'charging'::text, 'paid'::text, 'unknown'::text]));


--
-- Name: checkout_item_course_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX checkout_item_course_idx ON public.checkout_item USING btree (course_id);


--
-- Name: cms_author_profile_handle_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX cms_author_profile_handle_unique ON public.cms_author_profile USING btree (handle);


--
-- Name: cms_course_published_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cms_course_published_at_idx ON public.cms_course USING btree (published_at);


--
-- Name: cms_course_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cms_course_status_idx ON public.cms_course USING btree (status);


--
-- Name: cms_entry_author_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cms_entry_author_idx ON public.cms_entry USING btree (author_id);


--
-- Name: cms_entry_draft_updated_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cms_entry_draft_updated_idx ON public.cms_entry USING btree (draft_updated_at);


--
-- Name: cms_entry_published_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cms_entry_published_at_idx ON public.cms_entry USING btree (published_at);


--
-- Name: cms_entry_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cms_entry_status_idx ON public.cms_entry USING btree (status);


--
-- Name: cms_entry_tag_entry_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX cms_entry_tag_entry_id_unique ON public.cms_entry_tag USING btree (entry_id);


--
-- Name: cms_lesson_course_slug_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX cms_lesson_course_slug_unique ON public.cms_lesson USING btree (course_id, slug);


--
-- Name: cms_lesson_module_position_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cms_lesson_module_position_idx ON public.cms_lesson USING btree (module_id, "position");


--
-- Name: cms_lesson_progress_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cms_lesson_progress_user_idx ON public.cms_lesson_progress USING btree (user_id);


--
-- Name: cms_lesson_progress_user_lesson_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX cms_lesson_progress_user_lesson_unique ON public.cms_lesson_progress USING btree (user_id, lesson_id);


--
-- Name: cms_media_course_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cms_media_course_idx ON public.cms_media USING btree (course_id, created_at DESC);


--
-- Name: cms_media_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cms_media_created_idx ON public.cms_media USING btree (created_at DESC);


--
-- Name: cms_media_entry_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cms_media_entry_idx ON public.cms_media USING btree (entry_id, created_at DESC);


--
-- Name: cms_media_library_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cms_media_library_idx ON public.cms_media USING btree (library, created_at DESC);


--
-- Name: cms_media_uploaded_by_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cms_media_uploaded_by_created_idx ON public.cms_media USING btree (uploaded_by, created_at DESC);


--
-- Name: cms_module_course_position_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cms_module_course_position_idx ON public.cms_module USING btree (course_id, "position");


--
-- Name: cms_revision_entity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cms_revision_entity_idx ON public.cms_revision USING btree (entity_type, entity_id, created_at);


--
-- Name: contact_message_thread_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX contact_message_thread_idx ON public.contact_message USING btree (thread_id, created_at);


--
-- Name: contact_thread_inbox_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX contact_thread_inbox_idx ON public.contact_thread USING btree (status, last_message_at DESC);


--
-- Name: contact_thread_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX contact_thread_user_idx ON public.contact_thread USING btree (user_id, last_message_at DESC);


--
-- Name: course_activity_course_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX course_activity_course_idx ON public.course_activity USING btree (course_id, created_at DESC);


--
-- Name: course_changelog_course_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX course_changelog_course_idx ON public.course_changelog USING btree (course_id, created_at DESC);


--
-- Name: course_enrollment_live_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX course_enrollment_live_unique ON public.course_enrollment USING btree (course_id, user_id) WHERE (revoked_at IS NULL);


--
-- Name: course_enrollment_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX course_enrollment_user_idx ON public.course_enrollment USING btree (user_id);


--
-- Name: course_post_author_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX course_post_author_idx ON public.course_post USING btree (author_id, created_at);


--
-- Name: course_post_parent_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX course_post_parent_idx ON public.course_post USING btree (parent_id, created_at);


--
-- Name: course_post_review_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX course_post_review_idx ON public.course_post USING btree (course_id) WHERE (status = 'held'::text);


--
-- Name: course_post_threads_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX course_post_threads_idx ON public.course_post USING btree (course_id, last_reply_at) WHERE (parent_id IS NULL);


--
-- Name: course_sale_course_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX course_sale_course_idx ON public.course_sale USING btree (course_id, sold_at);


--
-- Name: course_sale_teacher_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX course_sale_teacher_idx ON public.course_sale USING btree (teacher_id, payable_at);


--
-- Name: decklists_event_public_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX decklists_event_public_idx ON public.decklists USING btree (event_id, is_public);


--
-- Name: decklists_public_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX decklists_public_created_idx ON public.decklists USING btree (is_public, created_at DESC);


--
-- Name: event_player_heroes_event_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX event_player_heroes_event_id_idx ON public.event_player_heroes USING btree (event_id);


--
-- Name: events_event_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX events_event_date_idx ON public.events USING btree (event_date);


--
-- Name: events_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX events_status_idx ON public.events USING btree (status);


--
-- Name: events_store_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX events_store_idx ON public.events USING btree (store_id, event_date);


--
-- Name: guide_read_month_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX guide_read_month_idx ON public.guide_read USING btree (month, course_id);


--
-- Name: guide_refund_request_live_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX guide_refund_request_live_unique ON public.guide_refund_request USING btree (checkout_item_id) WHERE (status <> 'denied'::text);


--
-- Name: guide_refund_request_queue_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX guide_refund_request_queue_idx ON public.guide_refund_request USING btree (status, created_at);


--
-- Name: guide_refund_request_teacher_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX guide_refund_request_teacher_idx ON public.guide_refund_request USING btree (teacher_id, status);


--
-- Name: idx_decklist_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_decklist_event ON public.decklists USING btree (event_id);


--
-- Name: idx_decklist_public; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_decklist_public ON public.decklists USING btree (event_id) WHERE (is_public = true);


--
-- Name: idx_event_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_date ON public.events USING btree (event_date);


--
-- Name: idx_lss_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lss_active ON public.lss_events USING btree (start_date) WHERE (is_active = true);


--
-- Name: idx_match_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_match_lookup ON public.matches USING btree (year, circuit, month);


--
-- Name: idx_match_round; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_match_round ON public.matches USING btree (round);


--
-- Name: idx_member_referral_code_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_member_referral_code_code ON public.member_referral_code USING btree (code);


--
-- Name: idx_member_referral_code_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_member_referral_code_user_id ON public.member_referral_code USING btree (user_id);


--
-- Name: idx_member_referral_referred; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_member_referral_referred ON public.member_referral USING btree (referred_user_id);


--
-- Name: idx_member_referral_referrer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_member_referral_referrer ON public.member_referral USING btree (referrer_user_id);


--
-- Name: idx_member_referral_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_member_referral_status ON public.member_referral USING btree (status);


--
-- Name: idx_partner_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partner_code ON public.partner USING btree (code);


--
-- Name: idx_partner_referral_partner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partner_referral_partner_id ON public.partner_referral USING btree (partner_id);


--
-- Name: idx_partner_referral_payout_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partner_referral_payout_status ON public.partner_referral USING btree (payout_status);


--
-- Name: idx_partner_referral_referred_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partner_referral_referred_user_id ON public.partner_referral USING btree (referred_user_id);


--
-- Name: idx_partner_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partner_user_id ON public.partner USING btree (user_id);


--
-- Name: idx_standing_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_standing_lookup ON public.standings USING btree (season, circuit);


--
-- Name: idx_standing_points; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_standing_points ON public.standings USING btree (total_points DESC);


--
-- Name: idx_vods_event_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vods_event_id ON public.vods USING btree (event_id);


--
-- Name: idx_vods_is_published; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vods_is_published ON public.vods USING btree (is_published);


--
-- Name: idx_vods_mux_asset_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vods_mux_asset_id ON public.vods USING btree (mux_asset_id);


--
-- Name: idx_vods_mux_upload_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vods_mux_upload_id ON public.vods USING btree (mux_upload_id);


--
-- Name: idx_vods_player1_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vods_player1_name ON public.vods USING btree (player1_name);


--
-- Name: idx_vods_player2_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vods_player2_name ON public.vods USING btree (player2_name);


--
-- Name: idx_vods_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vods_status ON public.vods USING btree (status);


--
-- Name: matches_event_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX matches_event_id_idx ON public.matches USING btree (event_id);


--
-- Name: matches_event_round_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX matches_event_round_idx ON public.matches USING btree (event_id, round);


--
-- Name: matches_round_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX matches_round_idx ON public.matches USING btree (round);


--
-- Name: member_event_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX member_event_at_idx ON public.member_event USING btree (at);


--
-- Name: member_event_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX member_event_user_idx ON public.member_event USING btree (user_id, at);


--
-- Name: notification_unread_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notification_unread_idx ON public.notification USING btree (user_id) WHERE (read_at IS NULL);


--
-- Name: notification_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notification_user_idx ON public.notification USING btree (user_id, created_at DESC);


--
-- Name: order_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX order_user_id_idx ON public."order" USING btree (user_id, created_at DESC);


--
-- Name: partner_attribution_pending_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX partner_attribution_pending_idx ON public.partner_attribution USING btree (attributed_at) WHERE (status = 'pending'::text);


--
-- Name: partner_ledger_bonus_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX partner_ledger_bonus_unique ON public.partner_ledger USING btree (referred_user_id) WHERE (entry_type = 'referral_bonus'::text);


--
-- Name: partner_ledger_item_sale_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX partner_ledger_item_sale_unique ON public.partner_ledger USING btree (checkout_item_id) WHERE (entry_type = 'sale'::text);


--
-- Name: partner_ledger_legacy_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX partner_ledger_legacy_unique ON public.partner_ledger USING btree (legacy_sale_id) WHERE (legacy_sale_id IS NOT NULL);


--
-- Name: partner_ledger_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX partner_ledger_order_idx ON public.partner_ledger USING btree (order_id) WHERE (order_id IS NOT NULL);


--
-- Name: partner_ledger_pool_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX partner_ledger_pool_unique ON public.partner_ledger USING btree (pool_month, teacher_id) WHERE (entry_type = 'pool_share'::text);


--
-- Name: partner_ledger_reversal_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX partner_ledger_reversal_unique ON public.partner_ledger USING btree (reverses_id) WHERE (entry_type = 'reversal'::text);


--
-- Name: partner_ledger_statement_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX partner_ledger_statement_idx ON public.partner_ledger USING btree (teacher_id, statement_month);


--
-- Name: partner_ledger_unsettled_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX partner_ledger_unsettled_idx ON public.partner_ledger USING btree (payable_at) WHERE ((entry_type = 'sale'::text) AND (settled_at IS NULL));


--
-- Name: payment_kind_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payment_kind_idx ON public.payment USING btree (kind, occurred_at);


--
-- Name: payment_occurred_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payment_occurred_idx ON public.payment USING btree (occurred_at);


--
-- Name: payment_subscription_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payment_subscription_idx ON public.payment USING btree (subscription_id, pay_num);


--
-- Name: payment_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payment_user_idx ON public.payment USING btree (user_id, occurred_at);


--
-- Name: refund_in_flight; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX refund_in_flight ON public.refund USING btree (trans_id) WHERE (status = ANY (ARRAY['pending'::text, 'waiting_settlement'::text]));


--
-- Name: refund_request_one_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX refund_request_one_pending ON public.refund_request USING btree (ticket_id) WHERE (status = 'pending'::text);


--
-- Name: refund_trans_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX refund_trans_idx ON public.refund USING btree (trans_id);


--
-- Name: roadmap_item_stage_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX roadmap_item_stage_idx ON public.roadmap_item USING btree (stage, "position");


--
-- Name: saved_card_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX saved_card_user_id_idx ON public.saved_card USING btree (user_id);


--
-- Name: saved_card_user_profile_live; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX saved_card_user_profile_live ON public.saved_card USING btree (user_id, payment_profile_id) WHERE (status <> ALL (ARRAY['deleted'::text, 'duplicate'::text]));


--
-- Name: standings_season_circuit_identity_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX standings_season_circuit_identity_key ON public.standings USING btree (season, circuit, COALESCE(gem_id, ('__name__'::text || player_name)));


--
-- Name: standings_season_circuit_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX standings_season_circuit_idx ON public.standings USING btree (season, circuit);


--
-- Name: standings_season_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX standings_season_idx ON public.standings USING btree (season);


--
-- Name: standings_total_points_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX standings_total_points_idx ON public.standings USING btree (total_points DESC NULLS LAST);


--
-- Name: status_check_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX status_check_at_idx ON public.status_check USING btree (at);


--
-- Name: status_check_component_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX status_check_component_at_idx ON public.status_check USING btree (component, at DESC);


--
-- Name: status_incident_open_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX status_incident_open_idx ON public.status_incident USING btree (resolved_at, starts_at DESC);


--
-- Name: status_update_incident_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX status_update_incident_idx ON public.status_update USING btree (incident_id, created_at);


--
-- Name: store_activity_store_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX store_activity_store_idx ON public.store_activity USING btree (store_id, created_at DESC);


--
-- Name: store_circuit_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX store_circuit_idx ON public.store USING btree (circuit_id);


--
-- Name: store_ledger_event_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX store_ledger_event_idx ON public.store_ledger USING btree (event_id);


--
-- Name: store_ledger_payout_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX store_ledger_payout_idx ON public.store_ledger USING btree (store_id, payout_id);


--
-- Name: store_ledger_statement_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX store_ledger_statement_idx ON public.store_ledger USING btree (store_id, statement_month);


--
-- Name: store_ledger_ticket_entry_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX store_ledger_ticket_entry_key ON public.store_ledger USING btree (ticket_id, entry_type) WHERE (ticket_id IS NOT NULL);


--
-- Name: store_member_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX store_member_user_idx ON public.store_member USING btree (user_id);


--
-- Name: store_payout_event_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX store_payout_event_key ON public.store_payout USING btree (store_id, event_id) WHERE (event_id IS NOT NULL);


--
-- Name: studio_channel_video_channel_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX studio_channel_video_channel_idx ON public.studio_channel_video USING btree (channel_id, published_at DESC);


--
-- Name: studio_channel_video_featured_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX studio_channel_video_featured_idx ON public.studio_channel_video USING btree (is_featured, featured_at DESC) WHERE is_featured;


--
-- Name: studio_project_live_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX studio_project_live_idx ON public.studio_project USING btree (status, is_featured DESC, published_at DESC);


--
-- Name: subscription_due_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX subscription_due_idx ON public.subscription USING btree (next_charge_at) WHERE (status = 'active'::text);


--
-- Name: subscription_invoice_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX subscription_invoice_status_idx ON public.subscription_invoice USING btree (status, updated_at) WHERE (status = ANY (ARRAY['charging'::text, 'unknown'::text]));


--
-- Name: subscription_one_live_per_user; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX subscription_one_live_per_user ON public.subscription USING btree (user_id) WHERE (status <> 'ended'::text);


--
-- Name: subscription_period_end_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX subscription_period_end_idx ON public.subscription USING btree (current_period_end) WHERE (status = ANY (ARRAY['cancelled'::text, 'past_due'::text]));


--
-- Name: subscription_retry_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX subscription_retry_idx ON public.subscription USING btree (next_attempt_at) WHERE (status = 'past_due'::text);


--
-- Name: teacher_payout_teacher_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX teacher_payout_teacher_idx ON public.teacher_payout USING btree (teacher_id, pay_date);


--
-- Name: ticket_event_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ticket_event_active_idx ON public.ticket USING btree (event_id) WHERE (refunded = false);


--
-- Name: ticket_user_event_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ticket_user_event_idx ON public.ticket USING btree (user_id, event_id);


--
-- Name: user_comp_ends_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_comp_ends_idx ON public."user" USING btree (comp_ends_at) WHERE (comp_ends_at IS NOT NULL);


--
-- Name: vods_kind_published_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX vods_kind_published_idx ON public.vods USING btree (kind, is_published, published_at DESC);


--
-- Name: vods_show_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX vods_show_idx ON public.vods USING btree (show_id);


--
-- Name: billing_notice billing_notice_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_notice
    ADD CONSTRAINT billing_notice_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: ca_conversion ca_conversion_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ca_conversion
    ADD CONSTRAINT ca_conversion_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: ca_event ca_event_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ca_event
    ADD CONSTRAINT ca_event_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.cms_course(id) ON DELETE CASCADE;


--
-- Name: ca_event ca_event_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ca_event
    ADD CONSTRAINT ca_event_entry_id_fkey FOREIGN KEY (entry_id) REFERENCES public.cms_entry(id) ON DELETE CASCADE;


--
-- Name: ca_event ca_event_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ca_event
    ADD CONSTRAINT ca_event_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.cms_lesson(id) ON DELETE CASCADE;


--
-- Name: ca_event ca_event_view_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ca_event
    ADD CONSTRAINT ca_event_view_id_fkey FOREIGN KEY (view_id) REFERENCES public.ca_view(id) ON DELETE CASCADE;


--
-- Name: ca_event ca_event_vod_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ca_event
    ADD CONSTRAINT ca_event_vod_id_fkey FOREIGN KEY (vod_id) REFERENCES public.vods(id) ON DELETE CASCADE;


--
-- Name: ca_pageview ca_pageview_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ca_pageview
    ADD CONSTRAINT ca_pageview_entry_id_fkey FOREIGN KEY (entry_id) REFERENCES public.cms_entry(id) ON DELETE SET NULL;


--
-- Name: ca_pageview ca_pageview_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ca_pageview
    ADD CONSTRAINT ca_pageview_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: ca_pageview ca_pageview_view_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ca_pageview
    ADD CONSTRAINT ca_pageview_view_id_fkey FOREIGN KEY (view_id) REFERENCES public.ca_view(id) ON DELETE SET NULL;


--
-- Name: ca_view ca_view_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ca_view
    ADD CONSTRAINT ca_view_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.cms_course(id) ON DELETE CASCADE;


--
-- Name: ca_view ca_view_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ca_view
    ADD CONSTRAINT ca_view_entry_id_fkey FOREIGN KEY (entry_id) REFERENCES public.cms_entry(id) ON DELETE CASCADE;


--
-- Name: ca_view ca_view_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ca_view
    ADD CONSTRAINT ca_view_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.cms_lesson(id) ON DELETE CASCADE;


--
-- Name: ca_view ca_view_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ca_view
    ADD CONSTRAINT ca_view_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: ca_view ca_view_vod_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ca_view
    ADD CONSTRAINT ca_view_vod_id_fkey FOREIGN KEY (vod_id) REFERENCES public.vods(id) ON DELETE CASCADE;


--
-- Name: checkout checkout_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkout
    ADD CONSTRAINT checkout_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.cms_course(id) ON DELETE CASCADE;


--
-- Name: checkout checkout_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkout
    ADD CONSTRAINT checkout_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: checkout_item checkout_item_checkout_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkout_item
    ADD CONSTRAINT checkout_item_checkout_id_fkey FOREIGN KEY (checkout_id) REFERENCES public.checkout(id) ON DELETE CASCADE;


--
-- Name: checkout_item checkout_item_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkout_item
    ADD CONSTRAINT checkout_item_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.cms_course(id) ON DELETE RESTRICT;


--
-- Name: checkout_item checkout_item_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkout_item
    ADD CONSTRAINT checkout_item_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: checkout checkout_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkout
    ADD CONSTRAINT checkout_order_id_fkey FOREIGN KEY (order_id) REFERENCES public."order"(id) ON DELETE SET NULL;


--
-- Name: checkout checkout_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkout
    ADD CONSTRAINT checkout_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: cms_author_profile cms_author_profile_avatar_media_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_author_profile
    ADD CONSTRAINT cms_author_profile_avatar_media_id_fkey FOREIGN KEY (avatar_media_id) REFERENCES public.cms_media(id) ON DELETE SET NULL;


--
-- Name: cms_author_profile cms_author_profile_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_author_profile
    ADD CONSTRAINT cms_author_profile_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: cms_course cms_course_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_course
    ADD CONSTRAINT cms_course_author_id_fkey FOREIGN KEY (author_id) REFERENCES public."user"(id);


--
-- Name: cms_course cms_course_cover_image_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_course
    ADD CONSTRAINT cms_course_cover_image_id_fkey FOREIGN KEY (cover_image_id) REFERENCES public.cms_media(id);


--
-- Name: cms_course cms_course_draft_cover_image_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_course
    ADD CONSTRAINT cms_course_draft_cover_image_id_fkey FOREIGN KEY (draft_cover_image_id) REFERENCES public.cms_media(id);


--
-- Name: cms_course cms_course_draft_thumbnail_image_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_course
    ADD CONSTRAINT cms_course_draft_thumbnail_image_id_fkey FOREIGN KEY (draft_thumbnail_image_id) REFERENCES public.cms_media(id);


--
-- Name: cms_course cms_course_draft_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_course
    ADD CONSTRAINT cms_course_draft_updated_by_fkey FOREIGN KEY (draft_updated_by) REFERENCES public."user"(id);


--
-- Name: cms_course cms_course_thumbnail_image_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_course
    ADD CONSTRAINT cms_course_thumbnail_image_id_fkey FOREIGN KEY (thumbnail_image_id) REFERENCES public.cms_media(id);


--
-- Name: cms_entry cms_entry_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_entry
    ADD CONSTRAINT cms_entry_author_id_fkey FOREIGN KEY (author_id) REFERENCES public."user"(id);


--
-- Name: cms_entry cms_entry_cover_image_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_entry
    ADD CONSTRAINT cms_entry_cover_image_id_fkey FOREIGN KEY (cover_image_id) REFERENCES public.cms_media(id);


--
-- Name: cms_entry cms_entry_draft_cover_image_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_entry
    ADD CONSTRAINT cms_entry_draft_cover_image_id_fkey FOREIGN KEY (draft_cover_image_id) REFERENCES public.cms_media(id);


--
-- Name: cms_entry cms_entry_draft_thumbnail_image_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_entry
    ADD CONSTRAINT cms_entry_draft_thumbnail_image_id_fkey FOREIGN KEY (draft_thumbnail_image_id) REFERENCES public.cms_media(id);


--
-- Name: cms_entry cms_entry_draft_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_entry
    ADD CONSTRAINT cms_entry_draft_updated_by_fkey FOREIGN KEY (draft_updated_by) REFERENCES public."user"(id);


--
-- Name: cms_entry_tag cms_entry_tag_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_entry_tag
    ADD CONSTRAINT cms_entry_tag_entry_id_fkey FOREIGN KEY (entry_id) REFERENCES public.cms_entry(id) ON DELETE CASCADE;


--
-- Name: cms_entry_tag cms_entry_tag_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_entry_tag
    ADD CONSTRAINT cms_entry_tag_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.cms_tag(id) ON DELETE CASCADE;


--
-- Name: cms_entry cms_entry_thumbnail_image_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_entry
    ADD CONSTRAINT cms_entry_thumbnail_image_id_fkey FOREIGN KEY (thumbnail_image_id) REFERENCES public.cms_media(id);


--
-- Name: cms_lesson cms_lesson_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_lesson
    ADD CONSTRAINT cms_lesson_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.cms_course(id) ON DELETE CASCADE;


--
-- Name: cms_lesson cms_lesson_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_lesson
    ADD CONSTRAINT cms_lesson_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.cms_module(id) ON DELETE CASCADE;


--
-- Name: cms_lesson_progress cms_lesson_progress_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_lesson_progress
    ADD CONSTRAINT cms_lesson_progress_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.cms_lesson(id) ON DELETE CASCADE;


--
-- Name: cms_lesson_progress cms_lesson_progress_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_lesson_progress
    ADD CONSTRAINT cms_lesson_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: cms_media cms_media_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_media
    ADD CONSTRAINT cms_media_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.cms_course(id) ON DELETE SET NULL;


--
-- Name: cms_media cms_media_derived_from_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_media
    ADD CONSTRAINT cms_media_derived_from_fkey FOREIGN KEY (derived_from) REFERENCES public.cms_media(id) ON DELETE SET NULL;


--
-- Name: cms_media cms_media_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_media
    ADD CONSTRAINT cms_media_entry_id_fkey FOREIGN KEY (entry_id) REFERENCES public.cms_entry(id) ON DELETE SET NULL;


--
-- Name: cms_media cms_media_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_media
    ADD CONSTRAINT cms_media_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public."user"(id);


--
-- Name: cms_module cms_module_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_module
    ADD CONSTRAINT cms_module_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.cms_course(id) ON DELETE CASCADE;


--
-- Name: cms_revision cms_revision_saved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_revision
    ADD CONSTRAINT cms_revision_saved_by_fkey FOREIGN KEY (saved_by) REFERENCES public."user"(id);


--
-- Name: contact_message contact_message_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_message
    ADD CONSTRAINT contact_message_author_id_fkey FOREIGN KEY (author_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: contact_message contact_message_thread_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_message
    ADD CONSTRAINT contact_message_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.contact_thread(id) ON DELETE CASCADE;


--
-- Name: contact_thread contact_thread_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_thread
    ADD CONSTRAINT contact_thread_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: course_activity course_activity_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_activity
    ADD CONSTRAINT course_activity_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: course_activity course_activity_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_activity
    ADD CONSTRAINT course_activity_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.cms_course(id) ON DELETE CASCADE;


--
-- Name: course_activity course_activity_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_activity
    ADD CONSTRAINT course_activity_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.cms_lesson(id) ON DELETE SET NULL;


--
-- Name: course_changelog course_changelog_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_changelog
    ADD CONSTRAINT course_changelog_author_id_fkey FOREIGN KEY (author_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: course_changelog course_changelog_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_changelog
    ADD CONSTRAINT course_changelog_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.cms_course(id) ON DELETE CASCADE;


--
-- Name: course_changelog course_changelog_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_changelog
    ADD CONSTRAINT course_changelog_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.cms_lesson(id) ON DELETE SET NULL;


--
-- Name: course_enrollment course_enrollment_added_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_enrollment
    ADD CONSTRAINT course_enrollment_added_by_fkey FOREIGN KEY (added_by) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: course_enrollment course_enrollment_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_enrollment
    ADD CONSTRAINT course_enrollment_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.cms_course(id) ON DELETE CASCADE;


--
-- Name: course_enrollment course_enrollment_last_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_enrollment
    ADD CONSTRAINT course_enrollment_last_lesson_id_fkey FOREIGN KEY (last_lesson_id) REFERENCES public.cms_lesson(id) ON DELETE SET NULL;


--
-- Name: course_enrollment course_enrollment_muted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_enrollment
    ADD CONSTRAINT course_enrollment_muted_by_fkey FOREIGN KEY (muted_by) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: course_enrollment course_enrollment_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_enrollment
    ADD CONSTRAINT course_enrollment_order_id_fkey FOREIGN KEY (order_id) REFERENCES public."order"(id) ON DELETE SET NULL;


--
-- Name: course_enrollment course_enrollment_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_enrollment
    ADD CONSTRAINT course_enrollment_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: course_post course_post_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_post
    ADD CONSTRAINT course_post_author_id_fkey FOREIGN KEY (author_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: course_post course_post_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_post
    ADD CONSTRAINT course_post_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.cms_course(id) ON DELETE CASCADE;


--
-- Name: course_post course_post_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_post
    ADD CONSTRAINT course_post_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.cms_lesson(id) ON DELETE SET NULL;


--
-- Name: course_post course_post_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_post
    ADD CONSTRAINT course_post_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.course_post(id) ON DELETE CASCADE;


--
-- Name: course_post_report course_post_report_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_post_report
    ADD CONSTRAINT course_post_report_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.course_post(id) ON DELETE CASCADE;


--
-- Name: course_post_report course_post_report_reporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_post_report
    ADD CONSTRAINT course_post_report_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: course_post course_post_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_post
    ADD CONSTRAINT course_post_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: course_sale course_sale_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_sale
    ADD CONSTRAINT course_sale_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.cms_course(id) ON DELETE RESTRICT;


--
-- Name: course_sale course_sale_enrollment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_sale
    ADD CONSTRAINT course_sale_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES public.course_enrollment(id) ON DELETE SET NULL;


--
-- Name: course_sale course_sale_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_sale
    ADD CONSTRAINT course_sale_order_id_fkey FOREIGN KEY (order_id) REFERENCES public."order"(id) ON DELETE SET NULL;


--
-- Name: course_sale course_sale_payout_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_sale
    ADD CONSTRAINT course_sale_payout_fk FOREIGN KEY (payout_id) REFERENCES public.teacher_payout(id) ON DELETE SET NULL;


--
-- Name: course_sale course_sale_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_sale
    ADD CONSTRAINT course_sale_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: decklists decklists_event_id_events_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.decklists
    ADD CONSTRAINT decklists_event_id_events_id_fk FOREIGN KEY (event_id) REFERENCES public.events(id);


--
-- Name: decklists decklists_user_id_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.decklists
    ADD CONSTRAINT decklists_user_id_user_id_fk FOREIGN KEY (user_id) REFERENCES public."user"(id);


--
-- Name: event_player_heroes event_player_heroes_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_player_heroes
    ADD CONSTRAINT event_player_heroes_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: events events_closed_by_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_closed_by_user_id_fk FOREIGN KEY (closed_by) REFERENCES public."user"(id);


--
-- Name: events events_created_by_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_created_by_user_id_fk FOREIGN KEY (created_by) REFERENCES public."user"(id);


--
-- Name: events events_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id) ON DELETE SET NULL;


--
-- Name: guide_read guide_read_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guide_read
    ADD CONSTRAINT guide_read_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.cms_course(id) ON DELETE CASCADE;


--
-- Name: guide_read guide_read_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guide_read
    ADD CONSTRAINT guide_read_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: guide_refund_request guide_refund_request_checkout_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guide_refund_request
    ADD CONSTRAINT guide_refund_request_checkout_item_id_fkey FOREIGN KEY (checkout_item_id) REFERENCES public.checkout_item(id) ON DELETE RESTRICT;


--
-- Name: guide_refund_request guide_refund_request_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guide_refund_request
    ADD CONSTRAINT guide_refund_request_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.cms_course(id) ON DELETE SET NULL;


--
-- Name: guide_refund_request guide_refund_request_decided_by_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guide_refund_request
    ADD CONSTRAINT guide_refund_request_decided_by_user_fkey FOREIGN KEY (decided_by_user) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: guide_refund_request guide_refund_request_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guide_refund_request
    ADD CONSTRAINT guide_refund_request_order_id_fkey FOREIGN KEY (order_id) REFERENCES public."order"(id) ON DELETE RESTRICT;


--
-- Name: guide_refund_request guide_refund_request_refund_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guide_refund_request
    ADD CONSTRAINT guide_refund_request_refund_id_fkey FOREIGN KEY (refund_id) REFERENCES public.refund(id) ON DELETE SET NULL;


--
-- Name: guide_refund_request guide_refund_request_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guide_refund_request
    ADD CONSTRAINT guide_refund_request_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: guide_refund_request guide_refund_request_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guide_refund_request
    ADD CONSTRAINT guide_refund_request_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: legacy_arb legacy_arb_decided_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legacy_arb
    ADD CONSTRAINT legacy_arb_decided_by_fkey FOREIGN KEY (decided_by) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: legacy_arb legacy_arb_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legacy_arb
    ADD CONSTRAINT legacy_arb_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.subscription(id) ON DELETE SET NULL;


--
-- Name: legacy_arb legacy_arb_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legacy_arb
    ADD CONSTRAINT legacy_arb_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: lss_events lss_events_created_by_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lss_events
    ADD CONSTRAINT lss_events_created_by_user_id_fk FOREIGN KEY (created_by) REFERENCES public."user"(id);


--
-- Name: matches matches_event_id_events_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_event_id_events_id_fk FOREIGN KEY (event_id) REFERENCES public.events(id);


--
-- Name: member_event member_event_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_event
    ADD CONSTRAINT member_event_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: member_event member_event_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_event
    ADD CONSTRAINT member_event_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: member_referral_code member_referral_code_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_referral_code
    ADD CONSTRAINT member_referral_code_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: member_referral member_referral_referred_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_referral
    ADD CONSTRAINT member_referral_referred_user_id_fkey FOREIGN KEY (referred_user_id) REFERENCES public."user"(id);


--
-- Name: member_referral member_referral_referrer_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_referral
    ADD CONSTRAINT member_referral_referrer_user_id_fkey FOREIGN KEY (referrer_user_id) REFERENCES public."user"(id);


--
-- Name: member_referral member_referral_reward_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_referral
    ADD CONSTRAINT member_referral_reward_subscription_id_fkey FOREIGN KEY (reward_subscription_id) REFERENCES public.subscription(id) ON DELETE SET NULL;


--
-- Name: member_referral member_referral_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_referral
    ADD CONSTRAINT member_referral_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.subscription(id) ON DELETE SET NULL;


--
-- Name: notification notification_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification
    ADD CONSTRAINT notification_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: notification notification_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification
    ADD CONSTRAINT notification_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.cms_course(id) ON DELETE CASCADE;


--
-- Name: notification notification_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification
    ADD CONSTRAINT notification_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.cms_lesson(id) ON DELETE CASCADE;


--
-- Name: notification notification_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification
    ADD CONSTRAINT notification_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.course_post(id) ON DELETE CASCADE;


--
-- Name: notification notification_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification
    ADD CONSTRAINT notification_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: order order_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."order"
    ADD CONSTRAINT order_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: partner_account partner_account_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_account
    ADD CONSTRAINT partner_account_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: partner_attribution partner_attribution_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_attribution
    ADD CONSTRAINT partner_attribution_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partner(id) ON DELETE SET NULL;


--
-- Name: partner_attribution partner_attribution_referred_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_attribution
    ADD CONSTRAINT partner_attribution_referred_user_id_fkey FOREIGN KEY (referred_user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: partner_attribution partner_attribution_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_attribution
    ADD CONSTRAINT partner_attribution_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: partner partner_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner
    ADD CONSTRAINT partner_created_by_fkey FOREIGN KEY (created_by) REFERENCES public."user"(id);


--
-- Name: partner_ledger partner_ledger_buyer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_ledger
    ADD CONSTRAINT partner_ledger_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: partner_ledger partner_ledger_checkout_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_ledger
    ADD CONSTRAINT partner_ledger_checkout_item_id_fkey FOREIGN KEY (checkout_item_id) REFERENCES public.checkout_item(id) ON DELETE SET NULL;


--
-- Name: partner_ledger partner_ledger_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_ledger
    ADD CONSTRAINT partner_ledger_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.cms_course(id) ON DELETE SET NULL;


--
-- Name: partner_ledger partner_ledger_legacy_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_ledger
    ADD CONSTRAINT partner_ledger_legacy_sale_id_fkey FOREIGN KEY (legacy_sale_id) REFERENCES public.course_sale(id) ON DELETE SET NULL;


--
-- Name: partner_ledger partner_ledger_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_ledger
    ADD CONSTRAINT partner_ledger_order_id_fkey FOREIGN KEY (order_id) REFERENCES public."order"(id) ON DELETE SET NULL;


--
-- Name: partner_ledger partner_ledger_referred_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_ledger
    ADD CONSTRAINT partner_ledger_referred_user_id_fkey FOREIGN KEY (referred_user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: partner_ledger partner_ledger_reverses_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_ledger
    ADD CONSTRAINT partner_ledger_reverses_id_fkey FOREIGN KEY (reverses_id) REFERENCES public.partner_ledger(id) ON DELETE RESTRICT;


--
-- Name: partner_ledger partner_ledger_settled_payout_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_ledger
    ADD CONSTRAINT partner_ledger_settled_payout_id_fkey FOREIGN KEY (settled_payout_id) REFERENCES public.teacher_payout(id) ON DELETE SET NULL;


--
-- Name: partner_ledger partner_ledger_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_ledger
    ADD CONSTRAINT partner_ledger_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public."user"(id) ON DELETE RESTRICT;


--
-- Name: partner_referral partner_referral_first_charge_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_referral
    ADD CONSTRAINT partner_referral_first_charge_order_id_fkey FOREIGN KEY (first_charge_order_id) REFERENCES public."order"(id);


--
-- Name: partner_referral partner_referral_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_referral
    ADD CONSTRAINT partner_referral_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partner(id);


--
-- Name: partner_referral partner_referral_referred_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_referral
    ADD CONSTRAINT partner_referral_referred_user_id_fkey FOREIGN KEY (referred_user_id) REFERENCES public."user"(id);


--
-- Name: partner_referral partner_referral_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_referral
    ADD CONSTRAINT partner_referral_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.subscription(id) ON DELETE SET NULL;


--
-- Name: partner_statement partner_statement_paid_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_statement
    ADD CONSTRAINT partner_statement_paid_by_fkey FOREIGN KEY (paid_by) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: partner_statement partner_statement_payout_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_statement
    ADD CONSTRAINT partner_statement_payout_id_fkey FOREIGN KEY (payout_id) REFERENCES public.teacher_payout(id) ON DELETE SET NULL;


--
-- Name: partner_statement partner_statement_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_statement
    ADD CONSTRAINT partner_statement_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public."user"(id) ON DELETE RESTRICT;


--
-- Name: partner partner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner
    ADD CONSTRAINT partner_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: password_reset_token password_reset_token_user_id_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_token
    ADD CONSTRAINT password_reset_token_user_id_user_id_fk FOREIGN KEY (user_id) REFERENCES public."user"(id);


--
-- Name: payment payment_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment
    ADD CONSTRAINT payment_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL;


--
-- Name: payment payment_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment
    ADD CONSTRAINT payment_order_id_fkey FOREIGN KEY (order_id) REFERENCES public."order"(id) ON DELETE SET NULL;


--
-- Name: payment payment_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment
    ADD CONSTRAINT payment_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.ticket(id) ON DELETE SET NULL;


--
-- Name: payment payment_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment
    ADD CONSTRAINT payment_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: refund refund_guide_refund_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refund
    ADD CONSTRAINT refund_guide_refund_request_id_fkey FOREIGN KEY (guide_refund_request_id) REFERENCES public.guide_refund_request(id) ON DELETE SET NULL;


--
-- Name: refund refund_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refund
    ADD CONSTRAINT refund_order_id_fkey FOREIGN KEY (order_id) REFERENCES public."order"(id) ON DELETE SET NULL;


--
-- Name: refund_request refund_request_decided_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refund_request
    ADD CONSTRAINT refund_request_decided_by_fkey FOREIGN KEY (decided_by) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: refund_request refund_request_refund_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refund_request
    ADD CONSTRAINT refund_request_refund_id_fkey FOREIGN KEY (refund_id) REFERENCES public.refund(id) ON DELETE SET NULL;


--
-- Name: refund_request refund_request_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refund_request
    ADD CONSTRAINT refund_request_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.ticket(id) ON DELETE CASCADE;


--
-- Name: refund_request refund_request_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refund_request
    ADD CONSTRAINT refund_request_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: refund refund_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refund
    ADD CONSTRAINT refund_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: refund refund_subscription_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refund
    ADD CONSTRAINT refund_subscription_invoice_id_fkey FOREIGN KEY (subscription_invoice_id) REFERENCES public.subscription_invoice(id) ON DELETE SET NULL;


--
-- Name: roadmap_item roadmap_item_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_item
    ADD CONSTRAINT roadmap_item_created_by_fkey FOREIGN KEY (created_by) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: saved_card saved_card_user_id_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_card
    ADD CONSTRAINT saved_card_user_id_user_id_fk FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: session session_user_id_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_user_id_user_id_fk FOREIGN KEY (user_id) REFERENCES public."user"(id);


--
-- Name: staff_assignments staff_assignments_assigned_by_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_assignments
    ADD CONSTRAINT staff_assignments_assigned_by_user_id_fk FOREIGN KEY (assigned_by) REFERENCES public."user"(id);


--
-- Name: staff_assignments staff_assignments_event_id_events_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_assignments
    ADD CONSTRAINT staff_assignments_event_id_events_id_fk FOREIGN KEY (event_id) REFERENCES public.events(id);


--
-- Name: staff_assignments staff_assignments_user_id_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_assignments
    ADD CONSTRAINT staff_assignments_user_id_user_id_fk FOREIGN KEY (user_id) REFERENCES public."user"(id);


--
-- Name: status_incident status_incident_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.status_incident
    ADD CONSTRAINT status_incident_created_by_fkey FOREIGN KEY (created_by) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: status_update status_update_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.status_update
    ADD CONSTRAINT status_update_created_by_fkey FOREIGN KEY (created_by) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: status_update status_update_incident_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.status_update
    ADD CONSTRAINT status_update_incident_id_fkey FOREIGN KEY (incident_id) REFERENCES public.status_incident(id) ON DELETE CASCADE;


--
-- Name: store_activity store_activity_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_activity
    ADD CONSTRAINT store_activity_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: store_activity store_activity_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_activity
    ADD CONSTRAINT store_activity_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL;


--
-- Name: store_activity store_activity_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_activity
    ADD CONSTRAINT store_activity_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id) ON DELETE CASCADE;


--
-- Name: store store_circuit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store
    ADD CONSTRAINT store_circuit_id_fkey FOREIGN KEY (circuit_id) REFERENCES public.circuit(id) ON DELETE RESTRICT;


--
-- Name: store store_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store
    ADD CONSTRAINT store_created_by_fkey FOREIGN KEY (created_by) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: store_ledger store_ledger_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_ledger
    ADD CONSTRAINT store_ledger_created_by_fkey FOREIGN KEY (created_by) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: store_ledger store_ledger_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_ledger
    ADD CONSTRAINT store_ledger_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL;


--
-- Name: store_ledger store_ledger_payout_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_ledger
    ADD CONSTRAINT store_ledger_payout_id_fkey FOREIGN KEY (payout_id) REFERENCES public.store_payout(id) ON DELETE SET NULL;


--
-- Name: store_ledger store_ledger_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_ledger
    ADD CONSTRAINT store_ledger_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id) ON DELETE RESTRICT;


--
-- Name: store_ledger store_ledger_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_ledger
    ADD CONSTRAINT store_ledger_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.ticket(id) ON DELETE SET NULL;


--
-- Name: store_member store_member_added_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_member
    ADD CONSTRAINT store_member_added_by_fkey FOREIGN KEY (added_by) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: store_member store_member_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_member
    ADD CONSTRAINT store_member_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id) ON DELETE CASCADE;


--
-- Name: store_member store_member_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_member
    ADD CONSTRAINT store_member_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: store_payout store_payout_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_payout
    ADD CONSTRAINT store_payout_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL;


--
-- Name: store_payout store_payout_paid_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_payout
    ADD CONSTRAINT store_payout_paid_by_fkey FOREIGN KEY (paid_by) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: store_payout store_payout_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_payout
    ADD CONSTRAINT store_payout_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id) ON DELETE RESTRICT;


--
-- Name: store_program store_program_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_program
    ADD CONSTRAINT store_program_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: studio_channel studio_channel_cover_image_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_channel
    ADD CONSTRAINT studio_channel_cover_image_id_fkey FOREIGN KEY (cover_image_id) REFERENCES public.cms_media(id) ON DELETE SET NULL;


--
-- Name: studio_channel studio_channel_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_channel
    ADD CONSTRAINT studio_channel_created_by_fkey FOREIGN KEY (created_by) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: studio_channel_video studio_channel_video_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_channel_video
    ADD CONSTRAINT studio_channel_video_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.studio_channel(id) ON DELETE CASCADE;


--
-- Name: studio_channel_video studio_channel_video_featured_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_channel_video
    ADD CONSTRAINT studio_channel_video_featured_by_fkey FOREIGN KEY (featured_by) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: studio_project studio_project_cover_image_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_project
    ADD CONSTRAINT studio_project_cover_image_id_fkey FOREIGN KEY (cover_image_id) REFERENCES public.cms_media(id) ON DELETE SET NULL;


--
-- Name: studio_project studio_project_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_project
    ADD CONSTRAINT studio_project_created_by_fkey FOREIGN KEY (created_by) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: studio_show studio_show_cover_image_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_show
    ADD CONSTRAINT studio_show_cover_image_id_fkey FOREIGN KEY (cover_image_id) REFERENCES public.cms_media(id) ON DELETE SET NULL;


--
-- Name: studio_show studio_show_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_show
    ADD CONSTRAINT studio_show_created_by_fkey FOREIGN KEY (created_by) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: subscription_invoice subscription_invoice_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_invoice
    ADD CONSTRAINT subscription_invoice_order_id_fkey FOREIGN KEY (order_id) REFERENCES public."order"(id) ON DELETE SET NULL;


--
-- Name: subscription_invoice subscription_invoice_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_invoice
    ADD CONSTRAINT subscription_invoice_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.subscription(id) ON DELETE CASCADE;


--
-- Name: subscription subscription_saved_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription
    ADD CONSTRAINT subscription_saved_card_id_fkey FOREIGN KEY (saved_card_id) REFERENCES public.saved_card(id) ON DELETE SET NULL;


--
-- Name: subscription subscription_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription
    ADD CONSTRAINT subscription_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: teacher_payout teacher_payout_paid_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_payout
    ADD CONSTRAINT teacher_payout_paid_by_fkey FOREIGN KEY (paid_by) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: teacher_payout teacher_payout_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_payout
    ADD CONSTRAINT teacher_payout_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public."user"(id) ON DELETE RESTRICT;


--
-- Name: ticket ticket_event_id_events_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket
    ADD CONSTRAINT ticket_event_id_events_id_fk FOREIGN KEY (event_id) REFERENCES public.events(id);


--
-- Name: ticket ticket_order_id_order_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket
    ADD CONSTRAINT ticket_order_id_order_id_fk FOREIGN KEY (order_id) REFERENCES public."order"(id);


--
-- Name: ticket ticket_user_id_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket
    ADD CONSTRAINT ticket_user_id_user_id_fk FOREIGN KEY (user_id) REFERENCES public."user"(id);


--
-- Name: user user_comped_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_comped_by_fkey FOREIGN KEY (comped_by) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: vods vods_cover_image_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vods
    ADD CONSTRAINT vods_cover_image_id_fkey FOREIGN KEY (cover_image_id) REFERENCES public.cms_media(id) ON DELETE SET NULL;


--
-- Name: vods vods_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vods
    ADD CONSTRAINT vods_created_by_fkey FOREIGN KEY (created_by) REFERENCES public."user"(id);


--
-- Name: vods vods_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vods
    ADD CONSTRAINT vods_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL;


--
-- Name: vods vods_show_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vods
    ADD CONSTRAINT vods_show_id_fkey FOREIGN KEY (show_id) REFERENCES public.studio_show(id) ON DELETE SET NULL;


--
-- Name: _bak_024_member_event; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public._bak_024_member_event ENABLE ROW LEVEL SECURITY;

--
-- Name: _bak_024_member_referral; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public._bak_024_member_referral ENABLE ROW LEVEL SECURITY;

--
-- Name: _bak_024_member_referral_code; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public._bak_024_member_referral_code ENABLE ROW LEVEL SECURITY;

--
-- Name: _bak_024_order; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public._bak_024_order ENABLE ROW LEVEL SECURITY;

--
-- Name: _bak_024_partner; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public._bak_024_partner ENABLE ROW LEVEL SECURITY;

--
-- Name: _bak_024_partner_referral; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public._bak_024_partner_referral ENABLE ROW LEVEL SECURITY;

--
-- Name: _bak_024_payment; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public._bak_024_payment ENABLE ROW LEVEL SECURITY;

--
-- Name: _bak_024_saved_card; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public._bak_024_saved_card ENABLE ROW LEVEL SECURITY;

--
-- Name: _bak_024_ticket; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public._bak_024_ticket ENABLE ROW LEVEL SECURITY;

--
-- Name: _bak_024_user; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public._bak_024_user ENABLE ROW LEVEL SECURITY;

--
-- Name: billing_notice; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.billing_notice ENABLE ROW LEVEL SECURITY;

--
-- Name: billing_run; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.billing_run ENABLE ROW LEVEL SECURITY;

--
-- Name: ca_conversion; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ca_conversion ENABLE ROW LEVEL SECURITY;

--
-- Name: ca_event; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ca_event ENABLE ROW LEVEL SECURITY;

--
-- Name: ca_pageview; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ca_pageview ENABLE ROW LEVEL SECURITY;

--
-- Name: ca_view; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ca_view ENABLE ROW LEVEL SECURITY;

--
-- Name: checkout; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.checkout ENABLE ROW LEVEL SECURITY;

--
-- Name: checkout_item; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.checkout_item ENABLE ROW LEVEL SECURITY;

--
-- Name: circuit; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.circuit ENABLE ROW LEVEL SECURITY;

--
-- Name: cms_author_profile; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cms_author_profile ENABLE ROW LEVEL SECURITY;

--
-- Name: cms_course; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cms_course ENABLE ROW LEVEL SECURITY;

--
-- Name: cms_entry; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cms_entry ENABLE ROW LEVEL SECURITY;

--
-- Name: cms_entry_tag; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cms_entry_tag ENABLE ROW LEVEL SECURITY;

--
-- Name: cms_lesson; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cms_lesson ENABLE ROW LEVEL SECURITY;

--
-- Name: cms_lesson_progress; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cms_lesson_progress ENABLE ROW LEVEL SECURITY;

--
-- Name: cms_media; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cms_media ENABLE ROW LEVEL SECURITY;

--
-- Name: cms_module; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cms_module ENABLE ROW LEVEL SECURITY;

--
-- Name: cms_revision; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cms_revision ENABLE ROW LEVEL SECURITY;

--
-- Name: cms_tag; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cms_tag ENABLE ROW LEVEL SECURITY;

--
-- Name: contact_message; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.contact_message ENABLE ROW LEVEL SECURITY;

--
-- Name: contact_thread; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.contact_thread ENABLE ROW LEVEL SECURITY;

--
-- Name: course_activity; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.course_activity ENABLE ROW LEVEL SECURITY;

--
-- Name: course_changelog; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.course_changelog ENABLE ROW LEVEL SECURITY;

--
-- Name: course_enrollment; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.course_enrollment ENABLE ROW LEVEL SECURITY;

--
-- Name: course_post; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.course_post ENABLE ROW LEVEL SECURITY;

--
-- Name: course_post_report; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.course_post_report ENABLE ROW LEVEL SECURITY;

--
-- Name: course_sale; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.course_sale ENABLE ROW LEVEL SECURITY;

--
-- Name: decklists; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.decklists ENABLE ROW LEVEL SECURITY;

--
-- Name: event_player_heroes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.event_player_heroes ENABLE ROW LEVEL SECURITY;

--
-- Name: events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

--
-- Name: fab_card_lookup; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fab_card_lookup ENABLE ROW LEVEL SECURITY;

--
-- Name: guide_read; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.guide_read ENABLE ROW LEVEL SECURITY;

--
-- Name: guide_refund_request; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.guide_refund_request ENABLE ROW LEVEL SECURITY;

--
-- Name: legacy_arb; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.legacy_arb ENABLE ROW LEVEL SECURITY;

--
-- Name: lss_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lss_events ENABLE ROW LEVEL SECURITY;

--
-- Name: matches; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

--
-- Name: member_event; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.member_event ENABLE ROW LEVEL SECURITY;

--
-- Name: member_referral; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.member_referral ENABLE ROW LEVEL SECURITY;

--
-- Name: member_referral_code; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.member_referral_code ENABLE ROW LEVEL SECURITY;

--
-- Name: notification; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification ENABLE ROW LEVEL SECURITY;

--
-- Name: order; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public."order" ENABLE ROW LEVEL SECURITY;

--
-- Name: partner; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.partner ENABLE ROW LEVEL SECURITY;

--
-- Name: partner_account; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.partner_account ENABLE ROW LEVEL SECURITY;

--
-- Name: partner_attribution; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.partner_attribution ENABLE ROW LEVEL SECURITY;

--
-- Name: partner_ledger; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.partner_ledger ENABLE ROW LEVEL SECURITY;

--
-- Name: partner_referral; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.partner_referral ENABLE ROW LEVEL SECURITY;

--
-- Name: partner_statement; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.partner_statement ENABLE ROW LEVEL SECURITY;

--
-- Name: password_reset_token; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.password_reset_token ENABLE ROW LEVEL SECURITY;

--
-- Name: payment; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment ENABLE ROW LEVEL SECURITY;

--
-- Name: pool_run; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pool_run ENABLE ROW LEVEL SECURITY;

--
-- Name: refund; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.refund ENABLE ROW LEVEL SECURITY;

--
-- Name: refund_request; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.refund_request ENABLE ROW LEVEL SECURITY;

--
-- Name: roadmap_item; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.roadmap_item ENABLE ROW LEVEL SECURITY;

--
-- Name: saved_card; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.saved_card ENABLE ROW LEVEL SECURITY;

--
-- Name: session; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.session ENABLE ROW LEVEL SECURITY;

--
-- Name: staff_assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.staff_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: standings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.standings ENABLE ROW LEVEL SECURITY;

--
-- Name: status_check; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.status_check ENABLE ROW LEVEL SECURITY;

--
-- Name: status_incident; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.status_incident ENABLE ROW LEVEL SECURITY;

--
-- Name: status_update; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.status_update ENABLE ROW LEVEL SECURITY;

--
-- Name: store; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.store ENABLE ROW LEVEL SECURITY;

--
-- Name: store_activity; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.store_activity ENABLE ROW LEVEL SECURITY;

--
-- Name: store_ledger; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.store_ledger ENABLE ROW LEVEL SECURITY;

--
-- Name: store_member; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.store_member ENABLE ROW LEVEL SECURITY;

--
-- Name: store_payout; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.store_payout ENABLE ROW LEVEL SECURITY;

--
-- Name: store_program; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.store_program ENABLE ROW LEVEL SECURITY;

--
-- Name: studio_channel; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.studio_channel ENABLE ROW LEVEL SECURITY;

--
-- Name: studio_channel_video; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.studio_channel_video ENABLE ROW LEVEL SECURITY;

--
-- Name: studio_project; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.studio_project ENABLE ROW LEVEL SECURITY;

--
-- Name: studio_show; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.studio_show ENABLE ROW LEVEL SECURITY;

--
-- Name: subscription; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subscription ENABLE ROW LEVEL SECURITY;

--
-- Name: subscription_invoice; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subscription_invoice ENABLE ROW LEVEL SECURITY;

--
-- Name: teacher_payout; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.teacher_payout ENABLE ROW LEVEL SECURITY;

--
-- Name: ticket; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ticket ENABLE ROW LEVEL SECURITY;

--
-- Name: user; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public."user" ENABLE ROW LEVEL SECURITY;

--
-- Name: vods; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vods ENABLE ROW LEVEL SECURITY;

--
-- Name: webhook_event; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.webhook_event ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict mn8nXEmncgm5N7WZNJuWhe6fPbmUbttQT1fg5k6Gn88FzZL4un2IO1nrmnoud0e

