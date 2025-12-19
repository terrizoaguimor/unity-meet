'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { gsap } from 'gsap';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/Button';

/**
 * Landing page de Unity Meet - Plataforma exclusiva para Unity Financial Network
 */
export default function HomePage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [activeUseCase, setActiveUseCase] = useState(0);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.hero-content > *', {
        y: 40,
        opacity: 0,
        duration: 0.7,
        stagger: 0.15,
        ease: 'power2.out',
      });

      gsap.from('.floating-card', {
        y: 20,
        opacity: 0,
        duration: 0.6,
        stagger: 0.2,
        delay: 0.5,
        ease: 'power2.out',
      });
    });

    return () => ctx.revert();
  }, []);

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <Navbar transparent />

      {/* Hero Section */}
      <section
        ref={heroRef}
        className="relative pt-24 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden"
      >
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-20"
            style={{
              background: 'radial-gradient(circle, #512783 0%, transparent 70%)',
              filter: 'blur(80px)',
            }}
          />
          <div
            className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full opacity-20"
            style={{
              background: 'radial-gradient(circle, #f18918 0%, transparent 70%)',
              filter: 'blur(80px)',
            }}
          />
        </div>

        <div className="relative max-w-6xl mx-auto hero-content">
          {/* Badge */}
          <div className="flex justify-center mb-6">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 text-sm font-medium border border-primary-200 dark:border-primary-800">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-600"></span>
              </span>
              Exclusivo para Unity Financial Network
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-center text-neutral-900 dark:text-white mb-6 leading-tight tracking-tight">
            Tu sala de reuniones
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: 'linear-gradient(135deg, #512783 0%, #f18918 50%, #512783 100%)',
                backgroundSize: '200% auto',
              }}
            >
              privada en Unity
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-center text-neutral-600 dark:text-neutral-300 max-w-3xl mx-auto mb-10">
            La plataforma de videoconferencias diseñada exclusivamente para agentes y staff de
            Unity Financial Network. Conecta con tu equipo, presenta a prospectos e impulsa tu negocio.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link href="/room/create">
              <Button size="lg" className="px-8 text-base">
                Crear reunión ahora
                <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="px-8 text-base">
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Iniciar sesión
              </Button>
            </Link>
          </div>

          {/* Hero Visual - Meeting Preview */}
          <div className="relative max-w-5xl mx-auto">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-neutral-200 dark:border-neutral-800">
              {/* Browser Chrome */}
              <div className="flex items-center gap-2 px-4 py-3 bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="px-4 py-1 bg-neutral-200 dark:bg-neutral-800 rounded-lg text-xs text-neutral-500">
                    meet.unityfinancial.com/team-weekly
                  </div>
                </div>
              </div>

              {/* Meeting Preview */}
              <div className="relative bg-neutral-900 aspect-video">
                <div className="absolute inset-0 grid grid-cols-3 gap-2 p-3">
                  {/* Participants */}
                  {participants.map((participant, i) => (
                    <div
                      key={i}
                      className="relative rounded-xl overflow-hidden"
                      style={{
                        background: `linear-gradient(135deg, ${['#1e1b4b', '#312e81', '#3730a3', '#4338ca', '#4f46e5', '#6366f1'][i]} 0%, ${['#312e81', '#3730a3', '#4338ca', '#4f46e5', '#6366f1', '#818cf8'][i]} 100%)`,
                      }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white/20 flex items-center justify-center text-white text-lg sm:text-xl font-semibold">
                          {participant.name.split(' ').map(n => n[0]).join('')}
                        </div>
                      </div>
                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                        <span className="text-white text-xs bg-black/40 px-2 py-0.5 rounded flex items-center gap-1">
                          {participant.name}
                          {participant.role && (
                            <span className="bg-primary-500/80 px-1.5 rounded text-[10px]">{participant.role}</span>
                          )}
                        </span>
                        {i === 0 && (
                          <span className="flex items-center gap-1 text-green-400 text-xs bg-black/40 px-2 py-0.5 rounded">
                            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                            Hablando
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Meeting Controls Bar */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-neutral-800/90 backdrop-blur rounded-xl px-4 py-2">
                  <button className="p-2 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-white">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </button>
                  <button className="p-2 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-white">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <button className="p-2 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-white">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <div className="w-px h-6 bg-neutral-600" />
                  <button className="p-2 rounded-lg bg-red-500 hover:bg-red-600 text-white">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
                    </svg>
                  </button>
                </div>

                {/* Recording Indicator */}
                <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500/90 backdrop-blur px-3 py-1.5 rounded-lg">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  <span className="text-white text-xs font-medium">Grabando</span>
                </div>

                {/* AI Summary Panel */}
                <div className="absolute right-4 top-4 bottom-16 w-72 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden floating-card hidden lg:block">
                  <div className="p-3 border-b border-neutral-200 dark:border-neutral-700">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-neutral-900 dark:text-white">Unity AI</p>
                        <p className="text-xs text-neutral-500">Asistente en vivo</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 space-y-3 text-xs">
                    <div className="p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-100 dark:border-primary-800">
                      <p className="font-medium text-primary-800 dark:text-primary-300 mb-1">📝 Resumen</p>
                      <p className="text-neutral-600 dark:text-neutral-400">Discusión sobre nuevas estrategias de captación de clientes para Q1...</p>
                    </div>
                    <div className="p-2 bg-secondary-50 dark:bg-secondary-900/20 rounded-lg border border-secondary-100 dark:border-secondary-800">
                      <p className="font-medium text-secondary-800 dark:text-secondary-300 mb-1">⚡ Acción detectada</p>
                      <p className="text-neutral-600 dark:text-neutral-400">Roberto: Preparar presentación de productos para el próximo webinar</p>
                    </div>
                    <div className="p-2 bg-success-50 dark:bg-success-500/10 rounded-lg border border-success-100 dark:border-success-800">
                      <p className="font-medium text-success-700 dark:text-success-400 mb-1">📄 Documento compartido</p>
                      <p className="text-neutral-600 dark:text-neutral-400">Guía_Productos_2024.pdf</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Cards */}
            <div className="absolute -left-4 top-1/4 bg-white dark:bg-neutral-800 rounded-xl shadow-xl p-3 hidden xl:block floating-card">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-white">Link público generado</p>
                  <p className="text-xs text-neutral-500">Comparte con prospectos</p>
                </div>
              </div>
            </div>

            <div className="absolute -right-4 bottom-1/4 bg-white dark:bg-neutral-800 rounded-xl shadow-xl p-3 hidden xl:block floating-card">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-secondary-100 dark:bg-secondary-900/30 flex items-center justify-center text-secondary-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-white">2,500+ Agentes</p>
                  <p className="text-xs text-neutral-500">Activos en Unity</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white dark:bg-neutral-900">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl sm:text-4xl lg:text-5xl font-bold text-primary-600 dark:text-primary-400 mb-2">
                  {stat.value}
                </div>
                <div className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Unity Meet Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-950 dark:to-neutral-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-medium mb-4">
              Diseñado para ti
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-neutral-900 dark:text-white mb-4">
              ¿Por qué Unity Meet?
            </h2>
            <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
              Una plataforma creada específicamente para las necesidades de los agentes y
              staff de Unity Financial Network.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {whyUnityMeet.map((item, index) => (
              <div
                key={index}
                className="relative p-6 bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 hover:border-primary-300 dark:hover:border-primary-700 transition-all hover:shadow-xl group"
              >
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center mb-5 text-white"
                  style={{ background: item.gradient }}
                >
                  {item.icon}
                </div>
                <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">
                  {item.title}
                </h3>
                <p className="text-neutral-600 dark:text-neutral-400">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Key Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-neutral-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1 rounded-full bg-secondary-100 dark:bg-secondary-900/30 text-secondary-700 dark:text-secondary-300 text-sm font-medium mb-4">
              Características
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 dark:text-white mb-4">
              Todo lo que necesitas para crecer tu negocio
            </h2>
            <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
              Herramientas poderosas para conectar, presentar y cerrar más negocios
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {keyFeatures.map((feature, index) => (
              <div
                key={index}
                className="flex gap-5 p-6 bg-neutral-50 dark:bg-neutral-800 rounded-2xl hover:bg-neutral-100 dark:hover:bg-neutral-750 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white flex-shrink-0">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-neutral-600 dark:text-neutral-400 mb-3">
                    {feature.description}
                  </p>
                  {feature.highlights && (
                    <div className="flex flex-wrap gap-2">
                      {feature.highlights.map((highlight, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300"
                        >
                          {highlight}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-neutral-50 dark:bg-neutral-950">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-medium mb-4">
              Casos de uso
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 dark:text-white mb-4">
              Una plataforma, múltiples posibilidades
            </h2>
            <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
              Desde reuniones de equipo hasta webinars con cientos de participantes
            </p>
          </div>

          {/* Use Case Tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {useCases.map((useCase, index) => (
              <button
                key={index}
                onClick={() => setActiveUseCase(index)}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeUseCase === index
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/25'
                    : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                }`}
              >
                {useCase.tab}
              </button>
            ))}
          </div>

          {/* Active Use Case */}
          <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
            <div className="grid lg:grid-cols-2 gap-0">
              {/* Left - Info */}
              <div className="p-8 lg:p-12 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white">
                    {useCases[activeUseCase].icon}
                  </div>
                  <h3 className="text-2xl font-bold text-neutral-900 dark:text-white">
                    {useCases[activeUseCase].title}
                  </h3>
                </div>
                <p className="text-neutral-600 dark:text-neutral-400 mb-6 text-lg">
                  {useCases[activeUseCase].description}
                </p>
                <ul className="space-y-3 mb-8">
                  {useCases[activeUseCase].features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-neutral-700 dark:text-neutral-300">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/room/create">
                  <Button size="lg">
                    {useCases[activeUseCase].cta}
                    <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Button>
                </Link>
              </div>

              {/* Right - Visual */}
              <div className="bg-gradient-to-br from-primary-100 to-secondary-100 dark:from-primary-900/20 dark:to-secondary-900/20 p-8 lg:p-12 flex items-center justify-center">
                <div className="w-full max-w-md aspect-video bg-neutral-900 rounded-xl overflow-hidden shadow-2xl relative">
                  {/* Mock meeting visual */}
                  <div className="absolute inset-0 grid grid-cols-2 gap-1 p-2">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="rounded-lg"
                        style={{
                          background: `linear-gradient(135deg, ${['#512783', '#6b4390', '#8254ab', '#9d6fc6'][i]} 0%, ${['#6b4390', '#8254ab', '#9d6fc6', '#bb9ad9'][i]} 100%)`,
                        }}
                      />
                    ))}
                  </div>
                  {useCases[activeUseCase].hasWebinar && (
                    <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur rounded-lg px-3 py-2 flex items-center justify-between">
                      <span className="text-white text-xs">Webinar en vivo</span>
                      <span className="flex items-center gap-1 text-red-400 text-xs">
                        <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                        247 asistentes
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-neutral-900">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left - Content */}
            <div>
              <span className="inline-block px-4 py-1 rounded-full bg-secondary-100 dark:bg-secondary-900/30 text-secondary-700 dark:text-secondary-300 text-sm font-medium mb-4">
                Potenciado por IA
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 dark:text-white mb-6">
                Inteligencia artificial que
                <span className="text-primary-600 dark:text-primary-400"> trabaja para ti</span>
              </h2>
              <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-8">
                Mientras te concentras en tu presentación o reunión, nuestra IA captura
                cada detalle importante. Resúmenes automáticos, transcripciones y seguimiento
                de acciones sin esfuerzo.
              </p>

              <div className="space-y-4">
                {aiFeatures.map((feature, index) => (
                  <div key={index} className="flex items-start gap-4 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white flex-shrink-0">
                      {feature.icon}
                    </div>
                    <div>
                      <h4 className="font-semibold text-neutral-900 dark:text-white mb-1">
                        {feature.title}
                      </h4>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right - Visual */}
            <div className="relative">
              <div className="bg-neutral-100 dark:bg-neutral-800 rounded-2xl p-6 space-y-4">
                {/* AI Summary Card */}
                <div className="bg-white dark:bg-neutral-900 rounded-xl p-5 shadow-lg">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-neutral-900 dark:text-white">Resumen de reunión</h4>
                      <p className="text-xs text-neutral-500">Generado automáticamente</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
                    <p>• Se revisaron las metas de Q1 con el equipo de ventas</p>
                    <p>• Roberto presentó nuevos productos IUL disponibles</p>
                    <p>• María compartió estrategias de prospección efectivas</p>
                  </div>
                </div>

                {/* Action Items Card */}
                <div className="bg-white dark:bg-neutral-900 rounded-xl p-5 shadow-lg">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-secondary-500 to-warning-500 flex items-center justify-center text-white">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-neutral-900 dark:text-white">Acciones detectadas</h4>
                      <p className="text-xs text-neutral-500">3 tareas pendientes</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 text-xs font-medium">R</span>
                      <span className="text-neutral-700 dark:text-neutral-300">Enviar presentación IUL actualizada</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="w-6 h-6 rounded-full bg-secondary-100 dark:bg-secondary-900/30 flex items-center justify-center text-secondary-600 text-xs font-medium">M</span>
                      <span className="text-neutral-700 dark:text-neutral-300">Programar seguimiento con prospecto</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="w-6 h-6 rounded-full bg-success-100 dark:bg-success-500/10 flex items-center justify-center text-success-600 text-xs font-medium">C</span>
                      <span className="text-neutral-700 dark:text-neutral-300">Confirmar asistencia al webinar</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-neutral-50 dark:bg-neutral-950">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-medium mb-4">
              Testimonios
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 dark:text-white mb-4">
              Lo que dicen nuestros agentes
            </h2>
          </div>

          <div className="relative">
            <div className="bg-white dark:bg-neutral-800 rounded-2xl p-8 md:p-12 shadow-xl">
              <svg className="w-12 h-12 text-primary-200 dark:text-primary-800 mb-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
              </svg>
              <p className="text-xl md:text-2xl text-neutral-700 dark:text-neutral-200 mb-8 leading-relaxed">
                {testimonials[activeTestimonial].quote}
              </p>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white font-semibold text-lg">
                  {testimonials[activeTestimonial].name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <p className="font-semibold text-neutral-900 dark:text-white">
                    {testimonials[activeTestimonial].name}
                  </p>
                  <p className="text-sm text-neutral-500">
                    {testimonials[activeTestimonial].role}
                  </p>
                  <p className="text-xs text-primary-600 dark:text-primary-400 font-medium">
                    {testimonials[activeTestimonial].location}
                  </p>
                </div>
              </div>
            </div>

            {/* Dots */}
            <div className="flex justify-center gap-2 mt-6">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveTestimonial(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === activeTestimonial
                      ? 'w-8 bg-primary-600'
                      : 'bg-neutral-300 dark:bg-neutral-600'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-neutral-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 dark:text-white mb-4">
              Comienza en minutos
            </h2>
            <p className="text-lg text-neutral-600 dark:text-neutral-400">
              Configurar tu primera reunión es fácil
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative text-center">
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-gradient-to-r from-primary-500 to-transparent" />
                )}
                <div className="relative">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-primary-500/25">
                    {index + 1}
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-neutral-50 dark:bg-neutral-950">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 dark:text-white mb-4">
              Preguntas frecuentes
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <FAQItem key={index} question={faq.question} answer={faq.answer} />
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
            Únete a la familia Unity
          </h2>
          <p className="text-xl text-primary-100 mb-10 max-w-2xl mx-auto">
            Conecta con tu equipo, presenta a tus prospectos y lleva tu negocio al siguiente nivel
            con Unity Meet.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/room/create">
              <Button size="lg" variant="secondary" className="px-10 text-base">
                Crear mi primera reunión
                <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </Button>
            </Link>
            <Link href="/login">
              <Button
                size="lg"
                variant="outline"
                className="px-10 text-base border-white text-white hover:bg-white hover:text-primary-700"
              >
                Ya tengo cuenta
              </Button>
            </Link>
          </div>
          <p className="mt-8 text-primary-200 text-sm">
            ¿No eres parte de Unity todavía?{' '}
            <a href="https://unityfinancial.com" className="underline hover:text-white">
              Conoce cómo unirte
            </a>
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}

// FAQ Component
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between text-left bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-750 transition-colors"
      >
        <span className="font-medium text-neutral-900 dark:text-white">{question}</span>
        <svg
          className={`w-5 h-5 text-neutral-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="px-6 py-4 bg-neutral-50 dark:bg-neutral-800/50">
          <p className="text-neutral-600 dark:text-neutral-400">{answer}</p>
        </div>
      )}
    </div>
  );
}

// Data
const participants = [
  { name: 'Roberto M.', role: 'Director' },
  { name: 'María S.', role: 'Agente' },
  { name: 'Carlos R.', role: 'Agente' },
  { name: 'Ana G.', role: null },
  { name: 'Pedro L.', role: 'Staff' },
  { name: 'Laura K.', role: 'Agente' },
];

const stats = [
  { value: '2,500+', label: 'Agentes activos' },
  { value: '50K+', label: 'Reuniones mensuales' },
  { value: '99.9%', label: 'Uptime garantizado' },
  { value: '4.9/5', label: 'Satisfacción' },
];

const whyUnityMeet = [
  {
    title: 'Entorno 100% Privado',
    description: 'Tu espacio seguro exclusivo para agentes y staff de Unity. Todas las comunicaciones están cifradas y protegidas.',
    icon: <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>,
    gradient: 'linear-gradient(135deg, #512783 0%, #6b4390 100%)',
  },
  {
    title: 'Links Públicos para Prospectos',
    description: 'Genera enlaces únicos para invitar a personas externas a tus presentaciones sin comprometer la seguridad de tu equipo.',
    icon: <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>,
    gradient: 'linear-gradient(135deg, #f18918 0%, #ffa038 100%)',
  },
  {
    title: 'Grabación de Reuniones',
    description: 'Graba tus presentaciones y reuniones para entrenamiento, compliance o para compartir con quienes no pudieron asistir.',
    icon: <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" /></svg>,
    gradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
  },
  {
    title: 'Compartir Documentos',
    description: 'Comparte presentaciones, PDFs y materiales de venta directamente en la reunión sin salir de la plataforma.',
    icon: <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
  },
  {
    title: 'Modo Webinar',
    description: 'Organiza webinars y presentaciones a gran escala para entrenamientos, lanzamientos de productos o reclutamiento.',
    icon: <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>,
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
  },
  {
    title: 'IA para Productividad',
    description: 'Resúmenes automáticos, transcripciones y detección de acciones para que nunca pierdas un detalle importante.',
    icon: <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
    gradient: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
  },
];

const keyFeatures = [
  {
    title: 'Video HD y Audio Cristalino',
    description: 'Calidad profesional hasta 1080p con optimización automática. Impresiona a tus prospectos con presentaciones nítidas.',
    icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>,
    highlights: ['1080p HD', 'Cancelación de ruido', 'Bajo consumo'],
  },
  {
    title: 'Compartir Pantalla y Documentos',
    description: 'Comparte tu pantalla, ventanas específicas o documentos PDF directamente. Perfecto para mostrar productos y presentaciones.',
    icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
    highlights: ['Pantalla completa', 'Ventanas', 'PDFs'],
  },
  {
    title: 'Sala de Espera Personalizada',
    description: 'Controla quién entra a tus reuniones. Los prospectos esperan en un lobby con tu branding mientras los admites.',
    icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>,
    highlights: ['Branding personalizado', 'Control de acceso'],
  },
  {
    title: 'Grabación en la Nube',
    description: 'Graba automáticamente tus reuniones y accede a ellas desde cualquier dispositivo. Ideal para compliance y training.',
    icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" /></svg>,
    highlights: ['Almacenamiento ilimitado', 'Descarga MP4'],
  },
  {
    title: 'Chat y Reacciones en Vivo',
    description: 'Mantén la interacción con chat en tiempo real, reacciones y mano alzada. Perfecto para webinars interactivos.',
    icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>,
    highlights: ['Mensajes privados', 'Archivos', 'Emojis'],
  },
  {
    title: 'Fondos Virtuales Unity',
    description: 'Usa fondos personalizados con branding de Unity o difumina tu entorno para mantener la profesionalidad.',
    icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
    highlights: ['Branding Unity', 'Blur', 'Fondos HD'],
  },
];

const useCases = [
  {
    tab: 'Reuniones de equipo',
    title: 'Reuniones de Equipo',
    description: 'Mantén a tu downline conectado y alineado con reuniones semanales o diarias. Comparte actualizaciones, celebra logros y planifica estrategias juntos.',
    icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    features: [
      'Hasta 100 participantes por reunión',
      'Compartir pantalla para presentaciones',
      'Grabación automática para ausentes',
      'Chat para preguntas sin interrumpir',
    ],
    cta: 'Crear reunión de equipo',
    hasWebinar: false,
  },
  {
    tab: 'Presentaciones a prospectos',
    title: 'Presentaciones a Prospectos',
    description: 'Invita a prospectos externos con links públicos seguros. Presenta productos, oportunidades y cierra más negocios sin necesidad de reuniones presenciales.',
    icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    features: [
      'Links públicos para invitados externos',
      'Sala de espera con branding Unity',
      'Compartir documentos y presentaciones',
      'Grabar para seguimiento posterior',
    ],
    cta: 'Invitar un prospecto',
    hasWebinar: false,
  },
  {
    tab: 'Webinars',
    title: 'Webinars y Entrenamientos',
    description: 'Organiza webinars a gran escala para entrenamientos, lanzamientos de productos o sesiones de reclutamiento. Llega a cientos de personas simultáneamente.',
    icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>,
    features: [
      'Hasta 500 asistentes en modo webinar',
      'Control de quién puede hablar',
      'Q&A moderado en tiempo real',
      'Grabación HD automática',
    ],
    cta: 'Crear webinar',
    hasWebinar: true,
  },
  {
    tab: 'Cierres',
    title: 'Reuniones de Cierre',
    description: 'Sesiones uno a uno o con familias para cerrar ventas. Ambiente profesional con todas las herramientas que necesitas para sellar el trato.',
    icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
    features: [
      'Ambiente privado y profesional',
      'Compartir cotizaciones y documentos',
      'Firma electrónica integrada',
      'Grabación para compliance',
    ],
    cta: 'Programar cierre',
    hasWebinar: false,
  },
];

const aiFeatures = [
  {
    title: 'Resúmenes Automáticos',
    description: 'Al finalizar cada reunión, recibe un resumen ejecutivo con los puntos clave discutidos.',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  },
  {
    title: 'Transcripción en Tiempo Real',
    description: 'Todo lo que se dice queda transcrito automáticamente, identificando quién habló.',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>,
  },
  {
    title: 'Detección de Acciones',
    description: 'La IA identifica compromisos y tareas mencionados durante la reunión.',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>,
  },
  {
    title: 'Insights de Reuniones',
    description: 'Estadísticas sobre duración, participación y patrones para mejorar tus presentaciones.',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  },
];

const testimonials = [
  {
    quote: 'Unity Meet ha transformado la forma en que presento a mis prospectos. Antes tenía que coordinar reuniones presenciales, ahora cierro negocios desde cualquier lugar con la misma efectividad.',
    name: 'Roberto Martínez',
    role: 'Senior Agent',
    location: 'Miami, FL',
  },
  {
    quote: 'La función de webinar es increíble para entrenar a mi equipo. Puedo hacer sesiones semanales con todos mis agentes y las grabaciones quedan disponibles para quienes no pudieron asistir.',
    name: 'María González',
    role: 'District Manager',
    location: 'Houston, TX',
  },
  {
    quote: 'Los links públicos son perfectos para invitar familias a presentaciones. Se sienten cómodos sin tener que descargar nada y yo me veo profesional con los fondos de Unity.',
    name: 'Carlos Fernández',
    role: 'Field Agent',
    location: 'Los Angeles, CA',
  },
];

const steps = [
  {
    title: 'Inicia sesión',
    description: 'Accede con tus credenciales de Unity.',
  },
  {
    title: 'Crea una sala',
    description: 'Un clic para generar tu sala privada.',
  },
  {
    title: 'Invita participantes',
    description: 'Comparte el link o genera uno público.',
  },
  {
    title: 'Comienza',
    description: 'Presenta, graba y cierra negocios.',
  },
];

const faqs = [
  {
    question: '¿Unity Meet es solo para agentes de Unity Financial Network?',
    answer: 'Sí, Unity Meet es una plataforma exclusiva para agentes y staff de Unity Financial Network. Sin embargo, puedes generar links públicos para invitar a prospectos y clientes externos a tus reuniones sin que ellos necesiten una cuenta.',
  },
  {
    question: '¿Cómo funcionan los links públicos para prospectos?',
    answer: 'Puedes generar un link único para cada reunión que permite a personas externas unirse sin necesidad de registrarse. Los invitados entran a una sala de espera y tú decides cuándo admitirlos. Esto mantiene la seguridad mientras facilita las presentaciones.',
  },
  {
    question: '¿Las grabaciones quedan almacenadas de forma segura?',
    answer: 'Todas las grabaciones se almacenan en la nube con cifrado de extremo a extremo. Solo tú y los administradores autorizados tienen acceso. Puedes descargarlas, compartirlas o eliminarlas cuando quieras.',
  },
  {
    question: '¿Puedo usar Unity Meet para webinars grandes?',
    answer: 'Sí, el modo webinar permite hasta 500 asistentes. Incluye funciones como Q&A moderado, mano alzada, encuestas en vivo y control de quién puede hablar o compartir pantalla.',
  },
  {
    question: '¿Necesito descargar algún software?',
    answer: 'No, Unity Meet funciona completamente en el navegador. Solo necesitas Chrome, Firefox, Safari o Edge actualizados. También hay apps móviles disponibles para iOS y Android.',
  },
  {
    question: '¿Qué tan segura es la plataforma?',
    answer: 'Unity Meet usa cifrado de extremo a extremo para todas las comunicaciones. Cumplimos con estándares de seguridad empresarial y todos los datos están protegidos en servidores seguros en Estados Unidos.',
  },
];
