-- Generates a system invoice without granting dealers direct invoice writes.
CREATE OR REPLACE FUNCTION public.generate_dealer_invoice(p_order_id UUID)
RETURNS TABLE(invoice_id UUID, invoice_number TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_order public.orders;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication is required'; END IF;
  SELECT * INTO v_order FROM public.orders
  WHERE id = p_order_id AND dealer_id = get_my_dealer_id() AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order was not found'; END IF;
  RETURN QUERY INSERT INTO public.invoices (
    invoice_number, order_id, dealer_id, subtotal, cgst, sgst, igst,
    total_gst, grand_total, status, notes
  ) VALUES (
    generate_invoice_number(), v_order.id, v_order.dealer_id, v_order.subtotal,
    v_order.total_gst / 2, v_order.total_gst / 2, 0, v_order.total_gst,
    v_order.grand_total, 'issued', v_order.notes
  ) RETURNING id, invoices.invoice_number;
END;
$$;
REVOKE ALL ON FUNCTION public.generate_dealer_invoice(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_dealer_invoice(UUID) TO authenticated;
