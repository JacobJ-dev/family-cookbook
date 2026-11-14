# Teaching notes (history)

Session-by-session notes on how teaching went, moved out of `CLAUDE.md` on 2026-11-15 so that file keeps only the lasting rules. The lessons from these stories live in `CLAUDE.md` under "How to teach". This file is the background: read it when a similar situation comes up again.

## Recognition vs. building (2026-10-31)
The developer's own words: "Like a Lego kit: I can name every brick in a built kit, but without the manual I can't build it." `( )` vs `{ }` arrow bodies were taught again on 2026-10-31 with five console experiments (a–e); by milestone 4 they had it.

## Mental model that clicked (2026-10-30)
The form is a *draft* in browser memory; only Save sends it to the database. The developer first thought "Add ingredient" saved something.

## Storage and `Blob` weak spot (flagged 2026-10-30)
They ran the milestone 5 step 1 Storage RLS tests (all passed) but said they didn't fully understand that material yet, *especially Blobs*. What needed covering:
- What a `Blob` / `File` is (bytes + a MIME `type`), and why `new Blob(['hi'])` uploaded as `application/octet-stream` while the `contentType` option was ignored.
- MIME types, and the bucket's `allowed_mime_types` (415) vs. RLS (`new row violates…`), both sent as HTTP 400. Read `error.message`, not the status.
- Storage as rows in `storage.objects`, so file actions map to insert/select/delete policies. Also why the family can *see* a file but can't *delete* it (each command has its own `using`).
- Plan at the time: re-teach `Blob` hands-on at the start of step 5 (photo upload), with small console experiments first (`new Blob`, `.type`, `.size`, `await blob.text()`), then the real code.

## Photo upload walkthrough (landed 2026-11-13)
A written, table-heavy version failed on 2026-11-11. What worked: temporary `console.log`s, predictions before each run, one piece at a time. The developer saw the picker's `File` (`type`, `size`), the line where `toBlob`'s 2nd argument relabels it `image/jpeg`, a 57 KB PNG becoming a *116 KB* JPEG (pixels vs bytes), and the `<recipeId>/<random>.jpg` path. They also explained why the old photo is deleted *after* the new one is in place. The analogy that worked: a `File`/`Blob` is a **sealed parcel** with a label (`type`, `size`). The canvas unpacks it, and `toBlob` packs a new parcel with a new label.

## Planning ReviewForm (milestone 6, 2026-11-14)
Planning took four rounds of review and the developer got frustrated ("this is frustrating now"). What worked was a **skeleton with headings and blanks** (PROPS / STATE / LOAD / SAVE…), then a **code skeleton with blanks** for the save function. They said "I understand how it works, I don't know what to write for the structure." Their takeaway: the comment structure is good, but **discuss first** before handing over a format to fill in. The plan comments are in commit `064e063`, with Claude's lines marked `[C]`.

## The key demo (milestone 5)
They saw the index-key bug on screen but didn't recognize it as one until given a step-by-step table and an everyday analogy (coats on numbered chairs = index keys).

## Magic-link failure (2026-10)
A one-off sign-in bounce was most likely an expired or already-used link (`otp_expired`). It became the debugging checklist in `CLAUDE.md`.
