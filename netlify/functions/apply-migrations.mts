// Schema changes belong to the authenticated migration workflow, never a public SQL bridge.
export const handler = async () => ({ statusCode: 410, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Use the Supabase migration workflow to apply schema changes.' }) });
