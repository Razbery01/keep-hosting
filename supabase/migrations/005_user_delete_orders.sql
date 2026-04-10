-- Allow customers to delete their own orders (cascades to client_sites, build_events, file_uploads).
-- Use for clearing stuck test builds or abandoned previews. Not allowed to replace refunds for paid orders — app only shows remove when status is not paid/live/deployed.

DROP POLICY IF EXISTS "Users can delete own orders" ON public.orders;
CREATE POLICY "Users can delete own orders" ON public.orders
  FOR DELETE
  USING (auth.uid() = user_id);
