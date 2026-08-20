export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      texts: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          arabic: string;
          translation: string | null;
          source: string | null;
          occurred_on: string | null;
          notes: string | null;
          audio_path: string | null;
          audio_duration_ms: number | null;
          audio_line_starts_ms: number[] | null;
          search_arabic?: string | null;
          search_latin?: string | null;
          embedding?: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title: string;
          arabic: string;
          translation?: string | null;
          source?: string | null;
          occurred_on?: string | null;
          notes?: string | null;
          audio_path?: string | null;
          audio_duration_ms?: number | null;
          audio_line_starts_ms?: number[] | null;
          embedding?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          title?: string;
          arabic?: string;
          translation?: string | null;
          source?: string | null;
          occurred_on?: string | null;
          notes?: string | null;
          audio_path?: string | null;
          audio_duration_ms?: number | null;
          audio_line_starts_ms?: number[] | null;
          embedding?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      examples: {
        Row: {
          id: string;
          owner_id: string;
          text_id: string | null;
          source_line: number | null;
          arabic: string;
          translation: string | null;
          transliteration: string | null;
          notes: string | null;
          search_arabic?: string | null;
          search_latin?: string | null;
          embedding?: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          text_id?: string | null;
          source_line?: number | null;
          arabic: string;
          translation?: string | null;
          transliteration?: string | null;
          notes?: string | null;
          embedding?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          text_id?: string | null;
          source_line?: number | null;
          arabic?: string;
          translation?: string | null;
          transliteration?: string | null;
          notes?: string | null;
          embedding?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "examples_text_id_fkey";
            columns: ["text_id"];
            isOneToOne: false;
            referencedRelation: "texts";
            referencedColumns: ["id"];
          },
        ];
      };
      vocabulary: {
        Row: {
          id: string;
          owner_id: string;
          arabic: string;
          transliteration: string | null;
          part_of_speech: string | null;
          notes: string | null;
          root: string | null;
          search_arabic?: string | null;
          search_latin?: string | null;
          embedding?: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          arabic: string;
          transliteration?: string | null;
          part_of_speech?: string | null;
          notes?: string | null;
          root?: string | null;
          embedding?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          arabic?: string;
          transliteration?: string | null;
          part_of_speech?: string | null;
          notes?: string | null;
          root?: string | null;
          embedding?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      vocabulary_senses: {
        Row: {
          id: string;
          vocabulary_id: string;
          owner_id: string;
          gloss: string;
          lang: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          vocabulary_id: string;
          owner_id: string;
          gloss: string;
          lang?: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          vocabulary_id?: string;
          owner_id?: string;
          gloss?: string;
          lang?: string;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vocabulary_senses_vocabulary_id_fkey";
            columns: ["vocabulary_id"];
            isOneToOne: false;
            referencedRelation: "vocabulary";
            referencedColumns: ["id"];
          },
        ];
      };
      vocabulary_forms: {
        Row: {
          id: string;
          vocabulary_id: string;
          owner_id: string;
          arabic: string;
          slot: "present_3ms" | "plural" | null;
          search_arabic?: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          vocabulary_id: string;
          owner_id: string;
          arabic: string;
          slot?: "present_3ms" | "plural" | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          vocabulary_id?: string;
          owner_id?: string;
          arabic?: string;
          slot?: "present_3ms" | "plural" | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vocabulary_forms_vocabulary_id_fkey";
            columns: ["vocabulary_id"];
            isOneToOne: false;
            referencedRelation: "vocabulary";
            referencedColumns: ["id"];
          },
        ];
      };
      morph_patterns: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          arabic_sketch: string | null;
          form_label: string | null;
          meaning_shift: string | null;
          cue: string | null;
          notes: string | null;
          mastery_state: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          arabic_sketch?: string | null;
          form_label?: string | null;
          meaning_shift?: string | null;
          cue?: string | null;
          notes?: string | null;
          mastery_state?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          arabic_sketch?: string | null;
          form_label?: string | null;
          meaning_shift?: string | null;
          cue?: string | null;
          notes?: string | null;
          mastery_state?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      pattern_vocabulary: {
        Row: {
          pattern_id: string;
          vocabulary_id: string;
          role: string;
          created_at: string;
        };
        Insert: {
          pattern_id: string;
          vocabulary_id: string;
          role?: string;
          created_at?: string;
        };
        Update: {
          pattern_id?: string;
          vocabulary_id?: string;
          role?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pattern_vocabulary_pattern_id_fkey";
            columns: ["pattern_id"];
            isOneToOne: false;
            referencedRelation: "morph_patterns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pattern_vocabulary_vocabulary_id_fkey";
            columns: ["vocabulary_id"];
            isOneToOne: false;
            referencedRelation: "vocabulary";
            referencedColumns: ["id"];
          },
        ];
      };
      structures: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          arabic_form: string | null;
          transliteration: string | null;
          meaning: string | null;
          explanation: string | null;
          notes: string | null;
          search_arabic?: string | null;
          search_latin?: string | null;
          embedding?: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          arabic_form?: string | null;
          transliteration?: string | null;
          meaning?: string | null;
          explanation?: string | null;
          notes?: string | null;
          embedding?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          arabic_form?: string | null;
          transliteration?: string | null;
          meaning?: string | null;
          explanation?: string | null;
          notes?: string | null;
          embedding?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tags: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      text_tags: {
        Row: { text_id: string; tag_id: string };
        Insert: { text_id: string; tag_id: string };
        Update: { text_id?: string; tag_id?: string };
        Relationships: [
          {
            foreignKeyName: "text_tags_text_id_fkey";
            columns: ["text_id"];
            isOneToOne: false;
            referencedRelation: "texts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "text_tags_tag_id_fkey";
            columns: ["tag_id"];
            isOneToOne: false;
            referencedRelation: "tags";
            referencedColumns: ["id"];
          },
        ];
      };
      text_vocabulary: {
        Row: {
          text_id: string;
          vocabulary_id: string;
          role: string;
          created_at: string;
        };
        Insert: {
          text_id: string;
          vocabulary_id: string;
          role?: string;
          created_at?: string;
        };
        Update: {
          text_id?: string;
          vocabulary_id?: string;
          role?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "text_vocabulary_text_id_fkey";
            columns: ["text_id"];
            isOneToOne: false;
            referencedRelation: "texts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "text_vocabulary_vocabulary_id_fkey";
            columns: ["vocabulary_id"];
            isOneToOne: false;
            referencedRelation: "vocabulary";
            referencedColumns: ["id"];
          },
        ];
      };
      example_tags: {
        Row: { example_id: string; tag_id: string };
        Insert: { example_id: string; tag_id: string };
        Update: { example_id?: string; tag_id?: string };
        Relationships: [
          {
            foreignKeyName: "example_tags_example_id_fkey";
            columns: ["example_id"];
            isOneToOne: false;
            referencedRelation: "examples";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "example_tags_tag_id_fkey";
            columns: ["tag_id"];
            isOneToOne: false;
            referencedRelation: "tags";
            referencedColumns: ["id"];
          },
        ];
      };
      vocabulary_tags: {
        Row: { vocabulary_id: string; tag_id: string };
        Insert: { vocabulary_id: string; tag_id: string };
        Update: { vocabulary_id?: string; tag_id?: string };
        Relationships: [
          {
            foreignKeyName: "vocabulary_tags_vocabulary_id_fkey";
            columns: ["vocabulary_id"];
            isOneToOne: false;
            referencedRelation: "vocabulary";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vocabulary_tags_tag_id_fkey";
            columns: ["tag_id"];
            isOneToOne: false;
            referencedRelation: "tags";
            referencedColumns: ["id"];
          },
        ];
      };
      structure_tags: {
        Row: { structure_id: string; tag_id: string };
        Insert: { structure_id: string; tag_id: string };
        Update: { structure_id?: string; tag_id?: string };
        Relationships: [
          {
            foreignKeyName: "structure_tags_structure_id_fkey";
            columns: ["structure_id"];
            isOneToOne: false;
            referencedRelation: "structures";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "structure_tags_tag_id_fkey";
            columns: ["tag_id"];
            isOneToOne: false;
            referencedRelation: "tags";
            referencedColumns: ["id"];
          },
        ];
      };
      example_vocabulary: {
        Row: { example_id: string; vocabulary_id: string };
        Insert: { example_id: string; vocabulary_id: string };
        Update: { example_id?: string; vocabulary_id?: string };
        Relationships: [
          {
            foreignKeyName: "example_vocabulary_example_id_fkey";
            columns: ["example_id"];
            isOneToOne: false;
            referencedRelation: "examples";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "example_vocabulary_vocabulary_id_fkey";
            columns: ["vocabulary_id"];
            isOneToOne: false;
            referencedRelation: "vocabulary";
            referencedColumns: ["id"];
          },
        ];
      };
      example_structures: {
        Row: { example_id: string; structure_id: string };
        Insert: { example_id: string; structure_id: string };
        Update: { example_id?: string; structure_id?: string };
        Relationships: [
          {
            foreignKeyName: "example_structures_example_id_fkey";
            columns: ["example_id"];
            isOneToOne: false;
            referencedRelation: "examples";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "example_structures_structure_id_fkey";
            columns: ["structure_id"];
            isOneToOne: false;
            referencedRelation: "structures";
            referencedColumns: ["id"];
          },
        ];
      };
      import_runs: {
        Row: {
          id: string;
          owner_id: string;
          source_label: string | null;
          bundle: Json;
          decisions: Json;
          status: string;
          counts: Json | null;
          created_at: string;
          committed_at: string | null;
        };
        Insert: {
          id?: string;
          owner_id: string;
          source_label?: string | null;
          bundle: Json;
          decisions?: Json;
          status?: string;
          counts?: Json | null;
          created_at?: string;
          committed_at?: string | null;
        };
        Update: {
          id?: string;
          owner_id?: string;
          source_label?: string | null;
          bundle?: Json;
          decisions?: Json;
          status?: string;
          counts?: Json | null;
          created_at?: string;
          committed_at?: string | null;
        };
        Relationships: [];
      };
      review_items: {
        Row: {
          id: string;
          owner_id: string;
          example_id: string;
          due: string;
          stability: number;
          difficulty: number;
          elapsed_days: number;
          scheduled_days: number;
          learning_steps: number;
          reps: number;
          lapses: number;
          state: number;
          last_review_at: string | null;
          enrolled_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          example_id: string;
          due?: string;
          stability?: number;
          difficulty?: number;
          elapsed_days?: number;
          scheduled_days?: number;
          learning_steps?: number;
          reps?: number;
          lapses?: number;
          state?: number;
          last_review_at?: string | null;
          enrolled_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          example_id?: string;
          due?: string;
          stability?: number;
          difficulty?: number;
          elapsed_days?: number;
          scheduled_days?: number;
          learning_steps?: number;
          reps?: number;
          lapses?: number;
          state?: number;
          last_review_at?: string | null;
          enrolled_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "review_items_example_id_fkey";
            columns: ["example_id"];
            isOneToOne: false;
            referencedRelation: "examples";
            referencedColumns: ["id"];
          },
        ];
      };
      search_misses: {
        Row: {
          id: string;
          owner_id: string;
          query: string;
          layers_tried: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          query: string;
          layers_tried?: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          query?: string;
          layers_tried?: string[];
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      search_corpus: {
        Args: {
          search_query: string;
          result_limit?: number;
          fuzzy_threshold?: number;
        };
        Returns: {
          entity_type: string;
          entity_id: string;
          title: string;
          arabic: string | null;
          subtitle: string | null;
          score: number;
          match_label: string | null;
          match_layer: string | null;
          context: string[] | null;
        }[];
      };
      search_corpus_semantic: {
        Args: {
          query_embedding: string;
          result_limit?: number;
          match_threshold?: number;
        };
        Returns: {
          entity_type: string;
          entity_id: string;
          title: string;
          arabic: string | null;
          subtitle: string | null;
          score: number;
          match_label: string | null;
          match_layer: string | null;
          context: string[] | null;
        }[];
      };
      log_search_miss: {
        Args: {
          miss_query: string;
          layers?: string[];
        };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Text = Database["public"]["Tables"]["texts"]["Row"];
export type Example = Database["public"]["Tables"]["examples"]["Row"];
export type Vocabulary = Database["public"]["Tables"]["vocabulary"]["Row"];
export type VocabularySense =
  Database["public"]["Tables"]["vocabulary_senses"]["Row"];
export type VocabularyForm =
  Database["public"]["Tables"]["vocabulary_forms"]["Row"];
export type TextVocabulary =
  Database["public"]["Tables"]["text_vocabulary"]["Row"];
export type Structure = Database["public"]["Tables"]["structures"]["Row"];
export type MorphPattern =
  Database["public"]["Tables"]["morph_patterns"]["Row"];
export type PatternVocabulary =
  Database["public"]["Tables"]["pattern_vocabulary"]["Row"];
export type Tag = Database["public"]["Tables"]["tags"]["Row"];
export type ImportRun = Database["public"]["Tables"]["import_runs"]["Row"];
export type ReviewItem = Database["public"]["Tables"]["review_items"]["Row"];
