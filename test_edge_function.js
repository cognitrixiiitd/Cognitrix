import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://figrtcbvpzxrfwyxyrsm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpZ3J0Y2J2cHp4cmZ3eXh5cnNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NDU1MDUsImV4cCI6MjA4OTIyMTUwNX0.-NFH0EIP93N60EJJHO3sGhpx6JG16Wre0zFvGE_0w3Q';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFunction() {
  console.log("Invoking Edge Function...");
  
  // Note: Since I don't have the user's actual application_id or email, 
  // I will use a dummy one. If the admin client is working but the user already exists, it will return an error there.
  
  const response = await fetch(`${supabaseUrl}/functions/v1/approve-professor`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseKey}`
    },
    body: JSON.stringify({
      application_id: "00000000-0000-0000-0000-000000000000",
      email: "test_new_prof@example.com",
      full_name: "Test Name",
    })
  });
  
  const text = await response.text();
  console.log("HTTP Status:", response.status);
  console.log("Response Body:", text);
}

testFunction();
