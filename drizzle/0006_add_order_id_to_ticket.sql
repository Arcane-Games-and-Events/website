-- Add orderId foreign key to ticket table
-- This links tickets to their order records for cleaner data relationships

ALTER TABLE "ticket" ADD COLUMN "order_id" uuid;

-- Add foreign key constraint
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Create index for faster lookups
CREATE INDEX "ticket_order_id_idx" ON "ticket" ("order_id");
