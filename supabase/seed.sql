/*
  CommunityHub — local demo seed (runs on `supabase db reset`).

  LOCAL DEVELOPMENT ONLY. Never run against production: it creates users with a
  shared, published demo password.

  Demo password for every account: CommunityHub!2026

  | Email                       | Organization                  | Role         |
  |-----------------------------|-------------------------------|--------------|
  | super@communityhub.test     | (all)                         | Super Admin  |
  | admin@northstar.test        | Northstar School District     | Org Admin    |
  | editor@northstar.test       | Northstar School District     | Editor       |
  | viewer@northstar.test       | Northstar School District     | Viewer       |
  | admin@riverside.test        | Riverside Community Services  | Org Admin    |
  | editor@riverside.test       | Riverside Community Services  | Editor       |
  | viewer@riverside.test       | Riverside Community Services  | Viewer       |

  PDF files for seeded documents are uploaded by `npm run db:seed:storage`.
*/

-- ---------------------------------------------------------------------------
-- Users (auth.users + auth.identities; profiles are created by trigger)
-- ---------------------------------------------------------------------------
do $$
declare
  u record;
begin
  for u in
    select * from (values
      ('a0000000-0000-4000-8000-000000000000'::uuid, 'super@communityhub.test', 'Morgan Hale'),
      ('a1000000-0000-4000-8000-000000000001'::uuid, 'admin@northstar.test',    'Dana Whitfield'),
      ('a1000000-0000-4000-8000-000000000002'::uuid, 'editor@northstar.test',   'Luis Ortega'),
      ('a1000000-0000-4000-8000-000000000003'::uuid, 'viewer@northstar.test',   'Priya Raman'),
      ('b2000000-0000-4000-8000-000000000001'::uuid, 'admin@riverside.test',    'Grace Okafor'),
      ('b2000000-0000-4000-8000-000000000002'::uuid, 'editor@riverside.test',   'Sam Delgado'),
      ('b2000000-0000-4000-8000-000000000003'::uuid, 'viewer@riverside.test',   'Jordan Lee')
    ) as t(id, email, full_name)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new,
      email_change_token_current, phone_change, phone_change_token, reauthentication_token
    ) values (
      '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
      extensions.crypt('CommunityHub!2026', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', u.full_name), now(), now(),
      '', '', '', '', '', '', '', ''
    );

    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), u.id, u.id::text,
      jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
      'email', now(), now(), now()
    );
  end loop;
end $$;

update public.profiles set is_super_admin = true where id = 'a0000000-0000-4000-8000-000000000000';

-- ---------------------------------------------------------------------------
-- Organizations
-- ---------------------------------------------------------------------------
insert into public.organizations (id, name, slug, type, tagline, description, primary_color, contact_email, contact_phone, address) values
(
  '11111111-1111-4111-8111-111111111111',
  'Northstar School District', 'northstar-sd', 'school_district',
  'Every student. Every day. Every future.',
  'Northstar School District serves 14,200 students across 21 schools, from early learning centers to two comprehensive high schools.',
  '#1d4ed8', 'communications@northstar.test', '(555) 210-4400', '400 Polaris Avenue, Northstar, MN 55901'
),
(
  '22222222-2222-4222-8222-222222222222',
  'Riverside Community Services', 'riverside-community', 'community',
  'Neighbors helping neighbors since 1987.',
  'Riverside Community Services runs food access, senior support, youth programs and emergency assistance for the Riverside valley.',
  '#0f766e', 'hello@riverside.test', '(555) 380-1122', '12 Mill Street, Riverside, OR 97401'
);

insert into public.organization_members (organization_id, user_id, role) values
('11111111-1111-4111-8111-111111111111', 'a1000000-0000-4000-8000-000000000001', 'org_admin'),
('11111111-1111-4111-8111-111111111111', 'a1000000-0000-4000-8000-000000000002', 'editor'),
('11111111-1111-4111-8111-111111111111', 'a1000000-0000-4000-8000-000000000003', 'viewer'),
('22222222-2222-4222-8222-222222222222', 'b2000000-0000-4000-8000-000000000001', 'org_admin'),
('22222222-2222-4222-8222-222222222222', 'b2000000-0000-4000-8000-000000000002', 'editor'),
('22222222-2222-4222-8222-222222222222', 'b2000000-0000-4000-8000-000000000003', 'viewer');

-- Drop the actor-less audit rows produced by the bootstrap inserts above.
delete from public.audit_logs;

-- ---------------------------------------------------------------------------
-- Northstar content (attributed to the Northstar admin/editor in the audit log)
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"a1000000-0000-4000-8000-000000000001","role":"authenticated"}', false);

insert into public.pages (organization_id, title, slug, summary, body, status, show_in_nav, nav_order, author_id) values
('11111111-1111-4111-8111-111111111111', 'About the District', 'about',
 'Our mission, our schools, and the people who make Northstar a great place to learn.',
 E'Northstar School District serves more than 14,000 students in 21 schools across the northern valley.\n\n## Our mission\nEvery student graduates ready for college, career and community life.\n\n## By the numbers\n- 14,200 students\n- 21 schools, including 2 comprehensive high schools\n- 1,150 teachers and staff\n- 92% four-year graduation rate\n\n## Leadership\nThe district is governed by a seven-member elected Board of Education. Board meetings are held on the second and fourth Tuesday of each month at 6:30 PM in the District Office boardroom.',
 'published', true, 1, 'a1000000-0000-4000-8000-000000000001'),
('11111111-1111-4111-8111-111111111111', 'Enrollment & Registration', 'enrollment',
 'How to enroll a new student, transfer between schools, and update family information.',
 E'Families new to Northstar can enroll online year-round.\n\n## What you will need\n- Proof of residence (utility bill or lease dated within 60 days)\n- Birth certificate or passport\n- Immunization records\n- Most recent report card or transcript, if transferring\n\n## Kindergarten registration\nKindergarten registration for the 2027–28 school year opens January 15. Children must be five years old on or before September 1.\n\n## Need help?\nThe Welcome Center is open Monday–Friday, 8:00 AM to 4:30 PM, at the District Office.',
 'published', true, 2, 'a1000000-0000-4000-8000-000000000002'),
('11111111-1111-4111-8111-111111111111', 'Transportation', 'transportation',
 'Bus routes, eligibility and inclement weather procedures.',
 E'Northstar provides bus service to students who live more than one mile from their assigned school.\n\n## Finding your route\nRoute assignments are mailed in August and are available in the family portal.\n\n## Weather delays\nDelays and closures are posted here and announced by text and email by 6:00 AM.',
 'published', true, 3, 'a1000000-0000-4000-8000-000000000002'),
('11111111-1111-4111-8111-111111111111', 'School Board', 'school-board',
 'Board members, meeting schedule and public comment guidelines.',
 E'The Board of Education sets district policy and approves the annual budget.\n\n## Public comment\nCommunity members may speak for up to three minutes during the public comment period at each regular meeting. Sign up at the door before the meeting begins.',
 'published', true, 4, 'a1000000-0000-4000-8000-000000000001'),
('11111111-1111-4111-8111-111111111111', '2027 Strategic Plan (Draft)', 'strategic-plan-2027',
 'Working draft of the next five-year strategic plan. Internal review only.',
 E'This draft is under review by the cabinet and is not yet public.\n\n## Draft priorities\n- Early literacy\n- Career pathways\n- Facilities modernization',
 'draft', false, 0, 'a1000000-0000-4000-8000-000000000001');

insert into public.announcements (organization_id, title, message, priority, audience, status, publish_at, expires_at, author_id) values
('11111111-1111-4111-8111-111111111111', 'Two-hour delay Thursday due to ice',
 'All Northstar schools will start two hours late on Thursday due to icy roads. Morning pre-K is cancelled. Buses will run two hours later than their normal schedule.',
 'emergency', 'everyone', 'published', now() - interval '2 hours', now() + interval '2 days', 'a1000000-0000-4000-8000-000000000001'),
('11111111-1111-4111-8111-111111111111', 'Fall parent-teacher conferences',
 'Conferences will be held October 22–23. Sign up for a time slot through the family portal beginning October 8.',
 'important', 'families', 'published', now() - interval '1 day', now() + interval '30 days', 'a1000000-0000-4000-8000-000000000002'),
('11111111-1111-4111-8111-111111111111', 'Northstar High wins state robotics title',
 'Congratulations to the Northstar High Polaris Robotics team on winning the state championship! The team advances to nationals in Houston this spring.',
 'normal', 'everyone', 'published', now() - interval '3 days', null, 'a1000000-0000-4000-8000-000000000002'),
('11111111-1111-4111-8111-111111111111', 'Staff professional development day',
 'No school for students on Friday, November 7. Staff will attend district-wide professional learning sessions.',
 'normal', 'staff', 'draft', now() + interval '7 days', null, 'a1000000-0000-4000-8000-000000000002');

insert into public.documents (organization_id, title, description, category, file_path, file_size, is_public, uploaded_by) values
('11111111-1111-4111-8111-111111111111', '2026–27 District Calendar', 'Approved instructional calendar including holidays and early-release days.', 'Calendars',
 '11111111-1111-4111-8111-111111111111/seed-district-calendar.pdf', 2400, true, 'a1000000-0000-4000-8000-000000000002'),
('11111111-1111-4111-8111-111111111111', 'Student Code of Conduct', 'Expectations, rights and responsibilities for all Northstar students.', 'Policies',
 '11111111-1111-4111-8111-111111111111/seed-code-of-conduct.pdf', 2400, true, 'a1000000-0000-4000-8000-000000000001'),
('11111111-1111-4111-8111-111111111111', 'October Board Meeting Agenda', 'Regular meeting agenda, October 14.', 'Board Meetings',
 '11111111-1111-4111-8111-111111111111/seed-board-agenda-oct.pdf', 2400, true, 'a1000000-0000-4000-8000-000000000001'),
('11111111-1111-4111-8111-111111111111', 'Budget Working Papers (Internal)', 'Cabinet working draft. Not for public release.', 'Finance',
 '11111111-1111-4111-8111-111111111111/seed-budget-internal.pdf', 2400, false, 'a1000000-0000-4000-8000-000000000001');

-- ---------------------------------------------------------------------------
-- Riverside content
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"b2000000-0000-4000-8000-000000000001","role":"authenticated"}', false);

insert into public.pages (organization_id, title, slug, summary, body, status, show_in_nav, nav_order, author_id) values
('22222222-2222-4222-8222-222222222222', 'Who We Are', 'about',
 'A community nonprofit serving the Riverside valley for nearly four decades.',
 E'Riverside Community Services was founded in 1987 by a group of neighbors who wanted to make sure no one in the valley went without a meal.\n\n## What we do\n- Food pantry and mobile market\n- Senior meals and wellness checks\n- After-school youth programs\n- Emergency rent and utility assistance\n\n## Our team\nWe are 14 staff and more than 300 volunteers.',
 'published', true, 1, 'b2000000-0000-4000-8000-000000000001'),
('22222222-2222-4222-8222-222222222222', 'Food Pantry', 'food-pantry',
 'Hours, eligibility and what to bring.',
 E'The Riverside Food Pantry is open to all valley residents. No one is turned away.\n\n## Hours\n- Tuesday 10:00 AM – 2:00 PM\n- Thursday 3:00 PM – 7:00 PM\n- Saturday 9:00 AM – 12:00 PM\n\n## What to bring\nPlease bring a bag or box if you can. Photo ID is helpful but not required.',
 'published', true, 2, 'b2000000-0000-4000-8000-000000000002'),
('22222222-2222-4222-8222-222222222222', 'Volunteer', 'volunteer',
 'Join more than 300 neighbors who keep our programs running.',
 E'Volunteers sort food, deliver meals, tutor students and staff our front desk.\n\n## Getting started\nAttend a 45-minute orientation, offered the first Monday of every month at 6:00 PM.',
 'published', true, 3, 'b2000000-0000-4000-8000-000000000002'),
('22222222-2222-4222-8222-222222222222', 'Board Retreat Notes (Confidential)', 'board-retreat-notes',
 'Private notes from the annual board retreat.',
 E'Confidential — for board and senior staff only.\n\n## Topics\n- Second pantry location\n- Capital campaign timeline',
 'draft', false, 0, 'b2000000-0000-4000-8000-000000000001');

insert into public.announcements (organization_id, title, message, priority, audience, status, publish_at, expires_at, author_id) values
('22222222-2222-4222-8222-222222222222', 'Warming center open tonight',
 'With overnight lows below 20°F, the Riverside warming center at 12 Mill Street is open from 7:00 PM to 8:00 AM. Pets welcome.',
 'emergency', 'residents', 'published', now() - interval '3 hours', now() + interval '1 day', 'b2000000-0000-4000-8000-000000000001'),
('22222222-2222-4222-8222-222222222222', 'Thanksgiving meal boxes — sign up now',
 'Families can reserve a Thanksgiving meal box through November 15. Boxes include a turkey, sides and dessert for a family of six.',
 'important', 'families', 'published', now() - interval '1 day', now() + interval '40 days', 'b2000000-0000-4000-8000-000000000002'),
('22222222-2222-4222-8222-222222222222', 'Volunteer orientation moved',
 'November volunteer orientation will be held Tuesday the 4th instead of Monday the 3rd.',
 'normal', 'volunteers', 'published', now() - interval '4 days', null, 'b2000000-0000-4000-8000-000000000002');

insert into public.documents (organization_id, title, description, category, file_path, file_size, is_public, uploaded_by) values
('22222222-2222-4222-8222-222222222222', 'Emergency Assistance Application', 'Application for one-time rent or utility assistance.', 'Forms',
 '22222222-2222-4222-8222-222222222222/seed-assistance-application.pdf', 2400, true, 'b2000000-0000-4000-8000-000000000002'),
('22222222-2222-4222-8222-222222222222', '2025 Annual Report', 'Programs, outcomes and financial summary for 2025.', 'Reports',
 '22222222-2222-4222-8222-222222222222/seed-annual-report.pdf', 2400, true, 'b2000000-0000-4000-8000-000000000001'),
('22222222-2222-4222-8222-222222222222', 'Donor List (Confidential)', 'Major donor contact list. Staff only.', 'Development',
 '22222222-2222-4222-8222-222222222222/seed-donor-list.pdf', 2400, false, 'b2000000-0000-4000-8000-000000000001');

select set_config('request.jwt.claims', '', false);
