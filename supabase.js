// The publishable key is designed to be used in a website. Database rules in
// supabase-setup.sql keep private registrations visible only to organizers.
window.tournamentDb = window.supabase.createClient(
  'https://sxcgjmztdnoedxnjsxlw.supabase.co',
  'sb_publishable_zU17NbXF_dWXp8ZaDklc0Q_TR6_gy5r'
);
window.organizerEmails = ['gokuthemeatball@gmail.com', 'adrieljimenez067@gmail.com'];
