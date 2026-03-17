"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { MemeGenerator } from "@/components/meme-generator";

export default function MemePage() {
  return (
    <div className="container py-8 px-4 md:px-6">
      <div className="w-full">
        <div className="flex items-center mb-6">
          <Link href="/" passHref>
            <Button variant="outline" size="icon" className="mr-4">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold font-headline">Meme Generator</h1>
        </div>
        <MemeGenerator />
      </div>
    </div>
  );
}
