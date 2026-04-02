const SUPABASE_URL = 'https://sclezwxhxgkpsqmbbeey.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjbGV6d3hoeGdrcHNxbWJiZWV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0NDQ3NzcsImV4cCI6MjA4OTAyMDc3N30.RU7gj3OsRzuf8V0HrapEkPxaKLirLhnhr9MGabYPaBU';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// expose as global for inline script use
window.sb = sb;

export default sb;
