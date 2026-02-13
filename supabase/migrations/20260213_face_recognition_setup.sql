-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Table to store detected faces and their embeddings
CREATE TABLE IF NOT EXISTS gallery_faces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    image_id BIGINT REFERENCES gallery_images(id) ON DELETE CASCADE,
    embedding vector(128) NOT NULL, -- 128-dimensional descriptor from face-api.js
    bounds JSONB NOT NULL, -- { x, y, width, height }
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Search function for finding similar faces
-- We use dot product similarity for speed, but cosine is usually better for faces.
-- descriptors from face-api.js are normalized, so dot product = cosine similarity.
CREATE OR REPLACE FUNCTION search_gallery_faces(
    query_embedding vector(128),
    match_threshold float,
    match_count int
)
RETURNS TABLE (
    image_id BIGINT,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        gf.image_id,
        1 - (gf.embedding <=> query_embedding) AS similarity
    FROM gallery_faces gf
    WHERE 1 - (gf.embedding <=> query_embedding) > match_threshold
    ORDER BY gf.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
