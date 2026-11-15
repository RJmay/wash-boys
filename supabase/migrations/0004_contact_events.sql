-- Two more ways in that are not a booking, counted like a phone tap.
--
--   text_tap      someone tapped "send a text" (sms: link)
--   callback_req  someone left their number on the "Call me back" form; the
--                 contact itself is a row in `leads` with kind 'general'
--
-- The events check constraint lists every known type, so it is replaced
-- rather than altered.

alter table events drop constraint if exists events_type_known;

alter table events
  add constraint events_type_known check (
    type in (
      'scan', 'land', 'book_start', 'book_done',
      'call_tap', 'text_tap', 'callback_req',
      'quote_req', 'lead_out_of_area'
    )
  );
