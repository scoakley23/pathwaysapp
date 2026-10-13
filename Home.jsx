import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Mic, PenTool, BookOpen, CheckCircle, GraduationCap, Notebook, FileText, Search } from 'lucide-react';


export default function Home({ cachedUser }) {
  return (
    <div className="flex flex-col gap-8 pb-8">
      {/* Hero Section */}
      <section className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-10 py-8 px-6 md:px-10 rounded-3xl relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1A3A6D 0%, #2C5BA0 60%, #5C8BD3 100%)' }}>
        <img
          src="https://media.base44.com/images/public/6931bd654d327c7b2e36bfed/c6aa490d9_e696d8ff-522b-4687-a00d-ce15992779db.png"
          alt="Your learning journey"
          className="w-56 h-40 md:w-72 md:h-52 object-contain drop-shadow-2xl shrink-0"
        />
        <div className="space-y-4 max-w-xl text-center md:text-left">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">
            Your Pathway to <span style={{ color: '#E64A4A' }}>Citizenship</span>
          </h1>
          <p className="text-lg text-blue-100">
            Prepare for the US Citizenship Test with interactive lessons, practice dictation, vocabulary, and civics questions.
          </p>
          <div className="flex justify-center md:justify-start">
            <Link to={createPageUrl('Practice')}>
              <Button size="lg" className="h-12 px-7 text-base bg-white hover:bg-blue-50 shadow-xl" style={{ color: '#1A3A6D' }}>
                Start Practicing Now <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Link to={createPageUrl('Practice')} className="block">
            <Card className="h-full border-0 shadow-lg bg-white/50 backdrop-blur-sm hover:-translate-y-1 transition-transform duration-300 cursor-pointer hover:bg-blue-50">
            <CardContent className="p-5 md:p-8 space-y-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#E8EFF8', color: '#1A3A6D' }}>
                <BookOpen className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Reading Practice</h3>
                <p className="text-slate-600">
                Read official sentences aloud and get instant feedback on pronunciation.
                </p>
            </CardContent>
            </Card>
        </Link>

        <Link to={createPageUrl('Practice')} className="block">
            <Card className="h-full border-0 shadow-lg bg-white/50 backdrop-blur-sm hover:-translate-y-1 transition-transform duration-300 cursor-pointer hover:bg-blue-50">
            <CardContent className="p-5 md:p-8 space-y-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#D6E4F5', color: '#2C5BA0' }}>
                <Mic className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Dictation Practice</h3>
                <p className="text-slate-600">
                Listen to official audio and practice typing exactly what you hear.
                </p>
            </CardContent>
            </Card>
        </Link>

        <Link to={createPageUrl('Practice')} className="block">
            <Card className="h-full border-0 shadow-lg bg-white/50 backdrop-blur-sm hover:-translate-y-1 transition-transform duration-300 cursor-pointer hover:bg-blue-50">
            <CardContent className="p-5 md:p-8 space-y-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#C3D7F0', color: '#5C8BD3' }}>
                <Notebook className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Vocabulary</h3>
                <p className="text-slate-600">
                Master the official reading and writing vocabulary lists.
                </p>
            </CardContent>
            </Card>
        </Link>

        <Link to={createPageUrl('Practice')} className="block">
            <Card className="h-full border-0 shadow-lg bg-white/50 backdrop-blur-sm hover:-translate-y-1 transition-transform duration-300 cursor-pointer hover:bg-blue-50">
            <CardContent className="p-5 md:p-8 space-y-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#FDE8E8', color: '#E64A4A' }}>
                <GraduationCap className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Civics Test</h3>
                <p className="text-slate-600">
                Prepare for the 100 questions with 2008 and 2025 versions.
                </p>
            </CardContent>
            </Card>
        </Link>
      </section>

      {/* USCIS Resources Section */}
      <section className="py-8">
        <Card className="border-0 shadow-lg overflow-hidden rounded-2xl">
          <div className="h-2" style={{ background: 'linear-gradient(90deg, #1A3A6D, #5C8BD3, #1A3A6D)' }} />
          <CardContent className="p-6 md:p-10">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <img
                src="https://media.base44.com/images/public/6931bd654d327c7b2e36bfed/a40404ef0_generated_image.png"
                alt="USCIS Official Seal"
                className="w-24 md:w-32 h-auto object-contain shrink-0"
              />
              <div className="flex-1 space-y-3 text-center md:text-left">
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900">Ready to Apply?</h2>
                <p className="text-slate-600 max-w-lg">
                  Access official USCIS resources to submit your N-400 Application for Naturalization and track your case status.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <a
                  href="https://www.uscis.gov/citizenship/apply-for-naturalization"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex"
                >
                  <Button size="lg" className="h-12 px-6 text-base whitespace-nowrap" style={{ backgroundColor: '#1A3A6D' }}>
                    <FileText className="mr-2 w-5 h-5" /> Apply for Naturalization
                  </Button>
                </a>
                <a
                  href="https://egov.uscis.gov/casestatus/landing.do"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex"
                >
                  <Button size="lg" variant="outline" className="h-12 px-6 text-base whitespace-nowrap border-slate-300 text-slate-700 hover:bg-slate-50">
                    <Search className="mr-2 w-5 h-5" /> Check Case Status
                  </Button>
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}