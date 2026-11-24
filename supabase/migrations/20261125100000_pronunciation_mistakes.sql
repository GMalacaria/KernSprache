-- Words the learner mispronounced become review cards: they are stored in `mistakes`
-- (original = corrected = the word, explanation_it = the pronunciation tip) with this category.
alter type public.mistake_category add value if not exists 'pronunciation';
