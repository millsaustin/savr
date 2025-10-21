# Savr Guardrails Walkthrough

1. **Start the app & authenticate**  
   - Boot the Supabase stack: `supabase start`  
   - Launch the web app (eg. `npm run dev` in `apps/web`).  
   - Sign in as a test user so your requests include a valid JWT.

2. **Explore the guardrails**  
   - In the chat UI (`/assistant`), send an intentionally off-topic prompt such as “Explain quantum physics”.  
   - Savr should reply with a friendly refusal card and a suggested on-topic example.

3. **Stay on topic**  
   - Use the “Try this instead” button or manually send:  
     `Plan five high-protein dinners under $200 using my pantry.`  
   - This prompt meets the similarity threshold and should succeed.

4. **Rate limiting in action**  
   - Submit a valid prompt six times in rapid succession.  
   - The sixth request should return `429_RATE_LIMITED` with the “Too many requests” message.

5. **Guardrail observability for admins**  
   - Log in with an allowed admin email (listed in `ALLOWED_ADMIN_EMAILS`).  
   - Visit `/admin/observability` to review off-topic rates, blocks, and spend savings.  
   - Adjust the similarity threshold via the slider and click **Save**.

6. **Test the updated threshold**  
   - Return to the chat and resubmit the previously off-topic prompt.  
   - If the new threshold is lower, the guard should now allow the request to proceed.

> The guardrail toggles are in-memory for demo purposes. Persist changes via environment/secrets management before deploying to production.
