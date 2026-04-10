-- Allow customers to delete their own orders (cascades to client_sites, build_events, file_uploads).
-- Dashboard only offers Remove when order.status is not paid/live/deployed.
--
-- If DELETE fails with a foreign-key error from public.subscriptions, that order still has a
-- subscription row — remove or adjust that row first (should not happen for unpaid test orders).

DROP POLICY IF EXISTS "Users can delete own orders" ON public.orders;
CREATE POLICY "Users can delete own orders" ON public.orders
  FOR DELETE
  USING (auth.uid() = user_id);
