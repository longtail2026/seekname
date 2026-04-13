--
-- PostgreSQL database dump
--

\restrict fJwY3x7F70O14OL1iv95bNPDQXu92kCCqvY4TbwXLSs79KvYTyiObwkXEIQ7jLC

-- Dumped from database version 17.9
-- Dumped by pg_dump version 17.9

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
-- Data for Name: classics_books; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.classics_books VALUES (1, 16, '菜根谭', '', '集部', '', NULL);
INSERT INTO public.classics_books VALUES (2, 20, '管子', '', '集部', '', NULL);
INSERT INTO public.classics_books VALUES (3, 6, '韩非子', '韩非', '子部', '先秦', NULL);
INSERT INTO public.classics_books VALUES (4, 18, '老子', '', '集部', '', NULL);
INSERT INTO public.classics_books VALUES (5, 22, '礼记', '戴圣', '经部', '先秦', NULL);
INSERT INTO public.classics_books VALUES (6, 14, '论语', '孔子弟子及再传弟子', '经部', '先秦', NULL);
INSERT INTO public.classics_books VALUES (7, 75, '吕氏春秋', '吕不韦', '子部', '先秦', NULL);
INSERT INTO public.classics_books VALUES (8, 59, '孟子', '孟轲', '经部', '先秦', NULL);
INSERT INTO public.classics_books VALUES (9, 67, '墨子', '墨翟', '子部', '先秦', NULL);
INSERT INTO public.classics_books VALUES (10, 81, '千字文', '', '集部', '', NULL);
INSERT INTO public.classics_books VALUES (11, 96, '三国志', '陈寿', '史部', '西晋', NULL);
INSERT INTO public.classics_books VALUES (12, 53, '尚书', '佚名', '经部', '先秦', NULL);
INSERT INTO public.classics_books VALUES (13, 78, '史记', '司马迁', '史部', '西汉', NULL);
INSERT INTO public.classics_books VALUES (14, 93, '世说新语', '', '集部', '', NULL);
INSERT INTO public.classics_books VALUES (15, 40, '文昌孝经', '', '集部', '', NULL);
INSERT INTO public.classics_books VALUES (16, 60, '孝经', '佚名', '经部', '先秦', NULL);
INSERT INTO public.classics_books VALUES (17, 17, '荀子', '荀况', '子部', '先秦', NULL);
INSERT INTO public.classics_books VALUES (18, 49, '庄子', '庄周', '子部', '先秦', NULL);
INSERT INTO public.classics_books VALUES (19, 51, '左传', '左丘明', '史部', '先秦', NULL);
INSERT INTO public.classics_books VALUES (20, 15, '论衡', '王充', '子部', '东汉', NULL);
INSERT INTO public.classics_books VALUES (21, 25, '淮南子', '刘安', '子部', '西汉', NULL);
INSERT INTO public.classics_books VALUES (22, 84, '列子', '列御寇', '子部', '先秦', NULL);
INSERT INTO public.classics_books VALUES (23, 5, '颜氏家训', '颜之推', '子部', '南北朝', NULL);
INSERT INTO public.classics_books VALUES (24, 4, '鬼谷子', '王诩', '子部', '先秦', NULL);
INSERT INTO public.classics_books VALUES (25, 62, '孙子兵法', '孙武', '子部', '先秦', NULL);


--
-- Name: classics_books_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.classics_books_id_seq', 25, true);


--
-- PostgreSQL database dump complete
--

\unrestrict fJwY3x7F70O14OL1iv95bNPDQXu92kCCqvY4TbwXLSs79KvYTyiObwkXEIQ7jLC

