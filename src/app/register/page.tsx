
import { Metadata } from 'next';
import RegisterForm from './RegisterForm';

export default function RegisterPage() {
    if (process.env.DISABLE_LOGIN || process.env.CLOUD_MODE) {
        return null;
    }

    return <RegisterForm />;
}

export const metadata: Metadata = {
    title: 'Sign Up',
};
