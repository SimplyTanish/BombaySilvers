-- =============================================================================
-- KYC document storage bucket + RLS
--
-- Dealers upload their statutory KYC documents into a PRIVATE bucket (never
-- public). Uploads and reads are scoped to the dealer's own auth-uid folder
-- (the first path segment), enforced by RLS on storage.objects. Staff and
-- above may read everything for review; writes for staff are not needed since
-- dealers self-serve uploads.
--
-- Path convention: kyc-documents/<user_id>/<document_type>-<ts>.<ext>
-- =============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc-documents', 'kyc-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Dealer: upload documents into their own folder.
CREATE POLICY "dealer_upload_own_kyc_docs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- Dealer: read + list their own documents.
CREATE POLICY "dealer_read_own_kyc_docs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- Staff and above: read + list all KYC documents for review.
CREATE POLICY "staff_read_all_kyc_docs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'kyc-documents' AND public.is_staff_or_above());

-- No UPDATE/DELETE policies: documents are append-only for users; only the
-- service role may delete or overwrite.