import { PhotoEditor } from '@/components/photo-editor';
import { OptiPicLogo } from '@/components/icons';
import { Separator } from '@/components/ui/separator';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center px-4 md:px-6">
          <a href="/" className="mr-6 flex items-center space-x-2">
            <OptiPicLogo className="h-6 w-6 text-primary" />
            <span className="font-bold font-headline sm:inline-block">
              OptiPic
            </span>
          </a>
        </div>
      </header>
      <main className="flex-1">
        <PhotoEditor />
      </main>
      <footer className="w-full">
         <div className="container px-4 md:px-6">
            <Separator className="mb-8" />
            <div className="flex flex-col items-center justify-between gap-4 pb-8 md:flex-row">
            <p className="text-center text-sm text-muted-foreground md:text-left">
                Built for speed and privacy. All processing is done on your device.
            </p>
            <p className="text-center text-sm text-muted-foreground md:text-left">
                &copy; {new Date().getFullYear()} OptiPic. All Rights Reserved.
            </p>
            </div>
         </div>
      </footer>
    </div>
  );
}
