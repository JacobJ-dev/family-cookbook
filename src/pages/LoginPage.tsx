import { useState } from "react";
import { supabase } from '../lib/supabase';



export default function LoginPage() {

    const [email, setEmail] = useState("");

    const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

    async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>){
        event.preventDefault();
        setStatus('sending');
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: { shouldCreateUser: false, emailRedirectTo: window.location.origin },
        });
        if(error){
            console.error(error);
        }
        setStatus(error ? 'error' : 'sent');
    }

    return (
        <div>
            <form onSubmit={handleSubmit}>
                <label htmlFor="email-field">Email: </label>
                <input id="email-field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required/>

                <button disabled={status === 'sending'} type="submit">Submit</button>
            </form>

            {(status === 'sent') &&<p>Check your inbox!</p> }
            {(status === 'error') && <p>We couldn't send a link to that email. Has {email} been invited?</p>}
        </div>
        
                


    );
}
