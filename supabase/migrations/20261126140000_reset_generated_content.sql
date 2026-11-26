-- Generated content switches to neutral field names (lesson.v3, chapter-test.v4): the old copies are thrown away
-- instead of being read in two formats (decision of 2026-11-26: the app has no other users yet). Lessons and
-- tests are generated again on demand; progress, statistics and review cards stay.
delete from public.lesson_content_cache;
delete from public.lesson_contents;
-- Tests never attempted would be reused with the old questions; attempted ones keep their scores.
delete from public.chapter_tests t
where not exists (select 1 from public.chapter_test_attempts a where a.test_id = t.id);
