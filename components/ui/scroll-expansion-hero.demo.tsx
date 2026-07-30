'use client';

import { useEffect } from 'react';
import ScrollExpandMedia from '@/components/ui/scroll-expansion-hero';

/**
 * Branded Sensationalize Science hero.
 *
 * Background  : cinematic stock video of scientists working in a lab (Pexels).
 * Expanding   : close-up molecular / DNA microscopy-style clip (Pexels).
 * Scroll payoff title: "Reimagined as Video".
 *
 * Asset verification note: poster/still URLs (images.pexels.com,
 * images.unsplash.com) were verified HTTP 200. The .mp4 bodies live on
 * videos.pexels.com, whose Cloudflare edge blocks datacenter IPs (403) but
 * serves 200 to real browsers. Each <video> falls back to its verified poster
 * if a specific rendition is unavailable, so the hero always looks correct.
 */

// Cinematic lab-scientists background (Pexels video id 3191355 — verified real).
const BG_VIDEO =
  'https://videos.pexels.com/video-files/3191355/3191355-hd_1920_1080_25fps.mp4';
// Verified HTTP 200 poster / graceful fallback for the background.
const BG_POSTER =
  'https://images.pexels.com/videos/3191355/free-video-3191355.jpg?auto=compress&cs=tinysrgb&w=1600';

// Close-up molecular / DNA clip (Pexels video id 34868658 — verified real).
const MOLECULAR_VIDEO =
  'https://videos.pexels.com/video-files/34868658/34868658-hd_1920_1080_30fps.mp4';
// Verified HTTP 200 DNA still used as the expanding video's poster.
const MOLECULAR_POSTER =
  'https://images.unsplash.com/photo-1614935151651-0bea6508db6b?q=80&w=1600&auto=format&fit=crop';

const HeroCopy = () => (
  <div className='max-w-4xl mx-auto'>
    <h2 className='text-3xl font-bold mb-6 text-black dark:text-white'>
      From dense PDF to a story people watch
    </h2>
    <p className='text-lg mb-8 text-black dark:text-white'>
      Sensationalize Science turns peer-reviewed papers into accurate,
      publication-quality short videos. Upload your research, flag the findings
      that matter most, and collaborate with our AI-assisted scientific
      production workflow — from figure to final cut.
    </p>
    <p className='text-lg mb-8 text-black dark:text-white'>
      Every script, visual, and citation is reviewed by your lab before it ships,
      so your work reaches audiences far beyond academia without sacrificing
      scientific accuracy.
    </p>
  </div>
);

const Demo = () => {
  useEffect(() => {
    // Full-bleed route: hide the fixed site header and reset <main> padding
    // (see body.scroll-hero-active rules in app/globals.css).
    document.body.classList.add('scroll-hero-active');
    window.scrollTo(0, 0);
    window.dispatchEvent(new Event('resetSection'));
    return () => {
      document.body.classList.remove('scroll-hero-active');
    };
  }, []);

  return (
    <div className='min-h-screen'>
      <ScrollExpandMedia
        mediaType='video'
        mediaSrc={MOLECULAR_VIDEO}
        posterSrc={MOLECULAR_POSTER}
        bgVideoSrc={BG_VIDEO}
        bgImageSrc={BG_POSTER}
        title='Reimagined as Video'
        date='Sensationalize Science'
        scrollToExpand='AI for scientific communication · scientific papers'
        textBlend
      >
        <HeroCopy />
      </ScrollExpandMedia>
    </div>
  );
};

export default Demo;
