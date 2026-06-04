"""Tests for CAIAO semantic routing module."""
from caiao._semantic import jaccard_similarity, ngram_similarity, semantic_search, tokenize


class TestTokenize:
    def test_simple(self):
        result = tokenize("hello world")
        assert "hello" in result
        assert "world" in result

    def test_underscore_separated(self):
        result = tokenize("my_tool_name")
        assert "my" in result
        assert "tool" in result
        assert "name" in result

    def test_camel_case(self):
        result = tokenize("camelCaseName")
        assert "camel" in result
        assert "case" in result
        assert "name" in result

    def test_single_char_tokens_removed(self):
        result = tokenize("a b c hello")
        assert "hello" in result
        assert "a" not in result
        assert "b" not in result
        assert "c" not in result

    def test_numbers_included(self):
        result = tokenize("tool123 name")
        assert "tool123" in result
        assert "name" in result

    def test_empty_string(self):
        result = tokenize("")
        assert result == set()

    def test_case_insensitive(self):
        result = tokenize("HELLO World")
        assert "hello" in result
        assert "world" in result


class TestJaccardSimilarity:
    def test_identical_sets(self):
        assert jaccard_similarity({"a", "b"}, {"a", "b"}) == 1.0

    def test_disjoint_sets(self):
        assert jaccard_similarity({"a", "b"}, {"c", "d"}) == 0.0

    def test_partial_overlap(self):
        sim = jaccard_similarity({"a", "b", "c"}, {"b", "c", "d"})
        assert sim == 2 / 4  # intersection={b,c}=2, union={a,b,c,d}=4

    def test_empty_first(self):
        assert jaccard_similarity(set(), {"a", "b"}) == 0.0

    def test_empty_second(self):
        assert jaccard_similarity({"a", "b"}, set()) == 0.0

    def test_both_empty(self):
        assert jaccard_similarity(set(), set()) == 0.0


class TestNgramSimilarity:
    def test_identical_strings(self):
        assert ngram_similarity("hello", "hello") == 1.0

    def test_disjoint_strings(self):
        assert ngram_similarity("abc", "xyz") == 0.0

    def test_partial_overlap(self):
        sim = ngram_similarity("hello", "hallo")
        assert 0 < sim < 1.0

    def test_short_strings(self):
        sim = ngram_similarity("a", "b")
        assert sim == 0.0

    def test_empty_first(self):
        assert ngram_similarity("", "hello") == 0.0

    def test_empty_second(self):
        assert ngram_similarity("hello", "") == 0.0

    def test_custom_n(self):
        sim_2 = ngram_similarity("hello", "hallo", n=2)
        sim_3 = ngram_similarity("hello", "hallo", n=3)
        assert sim_2 > sim_3  # 2-grams have higher chance of matching


class TestSemanticSearch:
    def test_exact_name_match(self):
        index = [{"name": "calculate", "keywords": tokenize("calculate compute"), "description": "A calculator"}]
        result = semantic_search("calculate", index)
        assert result is not None
        assert result["name"] == "calculate"

    def test_semantic_similarity(self):
        index = [
            {"name": "adder", "keywords": tokenize("adder add sum total plus"), "description": "Adds numbers"},
            {"name": "multiplier", "keywords": tokenize("multiplier multiply product times"),
             "description": "Multiplies numbers"},
        ]
        result = semantic_search("add", index)
        assert result is not None
        assert result["name"] == "adder"

    def test_no_match_below_threshold(self):
        index = [{"name": "calculator", "keywords": tokenize("calculate compute math"), "description": "Math tool"}]
        result = semantic_search("banana orange fruit", index, threshold=0.5)
        assert result is None

    def test_empty_index(self):
        result = semantic_search("hello", [])
        assert result is None

    def test_empty_query(self):
        index = [{"name": "tool", "keywords": tokenize("tool"), "description": "A tool"}]
        result = semantic_search("", index)
        assert result is None

    def test_multiple_entries_best_selected(self):
        index = [
            {"name": "dog", "keywords": tokenize("dog pet canine"), "description": "Dog"},
            {"name": "cat", "keywords": tokenize("cat pet feline"), "description": "Cat"},
        ]
        result = semantic_search("dog", index)
        assert result is not None
        assert result["name"] == "dog"

    def test_score_in_result(self):
        index = [{"name": "test_tool", "keywords": tokenize("test tool"), "description": "A test tool"}]
        result = semantic_search("test", index)
        assert result is not None
        assert "score" in result
        assert isinstance(result["score"], float)
