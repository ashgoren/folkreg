-- A donation is part of a payment: each entry in orders.payments records its own donationAmount
-- alongside the admission amount it was paid with. The separate column duplicated that, with
-- nothing keeping the two in agreement. An order's total donation is the sum over its payments.
alter table orders drop column donation;
