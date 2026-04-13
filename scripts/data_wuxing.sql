--
-- PostgreSQL database dump
--

\restrict kQkGABJbLAjpER7pcHJx4mlOoSadRa3wiVo04W4UkPscwBLaubu2npsZooevnbf

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
-- Data for Name: wuxing_characters; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.wuxing_characters VALUES (1, '明', '火', '明亮、光明', '适合聪明、有智慧的人', 'ming', 8, '2026-04-11 10:21:35.829983');
INSERT INTO public.wuxing_characters VALUES (2, '华', '水', '华丽、中华', '适合有才华、美丽的人', 'hua', 6, '2026-04-11 10:21:35.829983');
INSERT INTO public.wuxing_characters VALUES (3, '伟', '土', '伟大、雄伟', '适合有抱负、有成就的人', 'wei', 6, '2026-04-11 10:21:35.829983');
INSERT INTO public.wuxing_characters VALUES (4, '芳', '木', '芳香、花草', '适合温柔、美丽的女性', 'fang', 7, '2026-04-11 10:21:35.829983');
INSERT INTO public.wuxing_characters VALUES (5, '刚', '金', '刚强、刚毅', '适合坚强、果断的人', 'gang', 6, '2026-04-11 10:21:35.829983');
INSERT INTO public.wuxing_characters VALUES (6, '静', '金', '安静、平静', '适合文静、沉稳的人', 'jing', 14, '2026-04-11 10:21:35.829983');
INSERT INTO public.wuxing_characters VALUES (7, '勇', '土', '勇敢、勇猛', '适合勇敢、有胆识的人', 'yong', 9, '2026-04-11 10:21:35.829983');
INSERT INTO public.wuxing_characters VALUES (8, '慧', '水', '智慧、聪慧', '适合聪明、有智慧的人', 'hui', 15, '2026-04-11 10:21:35.829983');
INSERT INTO public.wuxing_characters VALUES (9, '强', '木', '强大、强壮', '适合有力量、有毅力的人', 'qiang', 11, '2026-04-11 10:21:35.829983');
INSERT INTO public.wuxing_characters VALUES (10, '美', '水', '美丽、美好', '适合美丽、善良的人', 'mei', 9, '2026-04-11 10:21:35.829983');
INSERT INTO public.wuxing_characters VALUES (11, '文', '水', '文化、文雅', '适合有文化修养的人', 'wen', 4, '2026-04-11 10:21:35.829983');
INSERT INTO public.wuxing_characters VALUES (12, '武', '水', '武术、武力', '适合勇敢、刚强的人', 'wu', 8, '2026-04-11 10:21:35.829983');
INSERT INTO public.wuxing_characters VALUES (13, '斌', '水', '文武双全', '适合全面发展的人', 'bin', 12, '2026-04-11 10:21:35.829983');
INSERT INTO public.wuxing_characters VALUES (14, '琳', '木', '美玉、珍贵', '适合珍贵、美丽的人', 'lin', 12, '2026-04-11 10:21:35.829983');
INSERT INTO public.wuxing_characters VALUES (15, '娜', '火', '婀娜、美丽', '适合美丽、优雅的女性', 'na', 9, '2026-04-11 10:21:35.829983');
INSERT INTO public.wuxing_characters VALUES (16, '浩', '水', '浩大、广阔', '适合胸怀广阔的人', 'hao', 10, '2026-04-11 10:21:35.829983');
INSERT INTO public.wuxing_characters VALUES (17, '宇', '土', '宇宙、空间', '适合有远大抱负的人', 'yu', 6, '2026-04-11 10:21:35.829983');
INSERT INTO public.wuxing_characters VALUES (18, '轩', '土', '高扬、气度', '适合气度不凡的人', 'xuan', 7, '2026-04-11 10:21:35.829983');
INSERT INTO public.wuxing_characters VALUES (19, '瑞', '金', '吉祥、好兆头', '适合带来好运的人', 'rui', 13, '2026-04-11 10:21:35.829983');
INSERT INTO public.wuxing_characters VALUES (20, '泽', '水', '恩泽、润泽', '适合仁慈、善良的人', 'ze', 8, '2026-04-11 10:21:35.829983');


--
-- Name: wuxing_characters_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.wuxing_characters_id_seq', 20, true);


--
-- PostgreSQL database dump complete
--

\unrestrict kQkGABJbLAjpER7pcHJx4mlOoSadRa3wiVo04W4UkPscwBLaubu2npsZooevnbf

