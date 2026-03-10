import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function ConvertPage() {
  return (
    <div className="container flex flex-col items-center justify-center min-h-screen py-8 text-center">
      <h1 className="text-4xl font-bold mb-4 font-headline">Converter Tools</h1>
      <p className="mb-8 text-lg text-muted-foreground max-w-md">
        This space is ready for new file conversion utilities. What should we build first?
      </p>
      <Link href="/" passHref>
        <Button variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Photo Editor
        </Button>
      </Link>
    </div>
  );
}
