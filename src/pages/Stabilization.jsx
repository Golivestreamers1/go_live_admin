import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ImageIcon, Video } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

const Stabilization = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">App Stability</h1>
        <p className="mt-1 text-gray-600">
          See how we keep the app smooth during live streams — for streamers and viewers.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        <Link to="/stabilization/native-images-memory-leak" className="block">
          <Card className="h-full cursor-pointer border-l-4 border-l-indigo-500 transition-shadow hover:shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-indigo-500" />
                Image Memory Savings
              </CardTitle>
              <CardDescription>
                See each live user&apos;s phone specs, photo memory in use, and how much we saved
                compared to their device RAM.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600">
                View live breakdown
                <ArrowRight className="h-4 w-4" />
              </span>
            </CardContent>
          </Card>
        </Link>

        <Link to="/stabilization/camera-mic-memory" className="block">
          <Card className="h-full cursor-pointer border-l-4 border-l-rose-500 transition-shadow hover:shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5 text-rose-500" />
                Camera &amp; Mic Cleanup
              </CardTitle>
              <CardDescription>
                See who is live now, recent clean exits, and the automatic steps that release
                camera and microphone hardware after every stream.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-rose-600">
                View cleanup activity
                <ArrowRight className="h-4 w-4" />
              </span>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
};

export default Stabilization;
