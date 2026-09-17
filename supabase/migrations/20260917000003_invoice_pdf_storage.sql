-- =============================================================================
-- Invoice PDF storage bucket + RLS
--
-- Invoices are stored as PDFs in a PRIVATE bucket (never public). Dealers may
-- only list/read objects whose path begins with their own dealer_id (the first
-- folder segment), enforced by RLS on storage.objects. Staff+ may read all.
-- Writes happen only through the server-side service-role client, which
-- bypasses RLS — authenticated users get NO INSERT/UPDATE on this bucket.
--
-- Path convention: invoices/<dealer_id>/<invoice_id>.pdf
-- =============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', false)
ON CONFLICT (id) DO NOTHING;

-- Dealer: read + list only their own invoice PDFs.
CREATE POLICY "dealer_read_own_invoice_pdfs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'invoices'
    AND (storage.foldername(name))[1] = public.get_my_dealer_id()::TEXT
  );

-- Staff and above: read all invoice PDFs.
CREATE POLICY "staff_read_all_invoice_pdfs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'invoices' AND public.is_staff_or_above());

-- No INSERT/UPDATE/DELETE policies: only the service role (server functions)
-- may upload/overwrite invoice PDFs. This keeps unguessable paths enforceable.