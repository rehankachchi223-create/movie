import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-amber-500 text-3xl font-black text-slate-950">4</div>
      <h1 className="text-4xl font-black text-white">Page not found</h1>
      <p className="mt-3 max-w-md text-slate-300">The movie page you are looking for doesn’t exist or has moved.</p>
      <Link to="/" className="mt-6">
        <Button>Back to home</Button>
      </Link>
    </div>
  );
}
