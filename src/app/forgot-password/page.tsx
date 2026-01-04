
import { Metadata } from 'next';
import ForgotPasswordForm from './ForgotPasswordForm';

export default function ForgotPasswordPage() {
    if (process.env.DISABLE_LOGIN || process.env.CLOUD_MODE) {
        return null;
    }

    return <ForgotPasswordForm />;
}

export const metadata: Metadata = {
    title: 'Forgot Password',
};
