'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Star, Clock, MapPin, Phone, LogIn, Menu,
  Award, Heart, Users, TrendingUp, Activity, Droplet,
  Shield, Stethoscope, Syringe, Pill, Quote, MessageCircle,
  Instagram, Video, ExternalLink
} from 'lucide-react';
import { useState } from 'react';

const WHATSAPP_NUMBER = '919429907575';
const WHATSAPP_BOOKING_MSG = encodeURIComponent("Hi, I'd like to book an appointment at Faith Clinic.");
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_BOOKING_MSG}`;
const INSTAGRAM_LINK = 'https://www.instagram.com/dr.aishwarya.faithclinic.abad?utm_source=qr';
const YOUTUBE_LINK = 'https://www.youtube.com/@draishwaryafaithclinic/shorts';

export default function LandingPageClient() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-3">
              <div className="bg-brand-teal p-2 rounded-xl">
                <Stethoscope className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-brand-teal">Faith Clinic</h1>
                <p className="text-xs text-gray-600">Medical Practice</p>
              </div>
            </div>

            <nav className="hidden md:flex items-center space-x-8" aria-label="Main navigation">
              <a href="#home" className="hover:text-teal-600 transition-colors">Home</a>
              <a href="#about" className="hover:text-teal-600 transition-colors">About</a>
              <a href="#services" className="hover:text-teal-600 transition-colors">Services</a>
              <a href="#testimonials" className="hover:text-teal-600 transition-colors">Testimonials</a>
              <a href="#contact" className="hover:text-teal-600 transition-colors">Contact</a>
            </nav>

            <div className="hidden md:flex items-center space-x-3">
              <a href="tel:+919429907575" className="flex items-center text-sm text-gray-600 hover:text-teal-600 transition-colors">
                <Phone className="w-4 h-4 mr-2" />
                +91 94299 07575
              </a>
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                Book Appointment
              </a>
            </div>

            <button 
              className="md:hidden p-2"
              aria-label="Toggle mobile menu"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t">
              <nav className="flex flex-col space-y-4" aria-label="Mobile navigation">
                <a href="#home" className="hover:text-teal-600 transition-colors">Home</a>
                <a href="#about" className="hover:text-teal-600 transition-colors">About</a>
                <a href="#services" className="hover:text-teal-600 transition-colors">Services</a>
                <a href="#testimonials" className="hover:text-teal-600 transition-colors">Testimonials</a>
                <a href="#contact" className="hover:text-teal-600 transition-colors">Contact</a>
                <a
                  href={WHATSAPP_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-green-500 text-white font-semibold px-4 py-2 rounded-full w-fit transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  Book Appointment
                </a>
              </nav>
            </div>
          )}
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <HeroSection />
        
        {/* About Section */}
        <AboutSection />
        
        {/* Services Section */}
        <ServicesSection />
        
        {/* Gallery Section */}
        <GallerySection />
        
        {/* Testimonials Section */}
        <TestimonialsSection />
        
        {/* Instagram / Health Tips Section */}
        <InstagramSection />
        
        {/* Contact Section */}
        <ContactSection />
      </main>

      {/* Footer */}
      <FooterSection />

      {/* Floating WhatsApp button — mobile */}
      <a
        href={WHATSAPP_LINK}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Book appointment via WhatsApp"
        className="fixed bottom-6 right-6 z-50 md:hidden flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold px-5 py-3 rounded-full shadow-xl transition-colors"
      >
        <MessageCircle className="w-5 h-5" />
        Book Appointment
      </a>
    </div>
  );
}

function HeroSection() {
  return (
    <section id="home" className="relative min-h-[600px] flex items-center overflow-hidden bg-teal-50">
      <div className="absolute inset-0 z-0">
        <Image 
          src="/landing-assets/hero-bg.jpg"
          alt="Faith Clinic interior – compassionate healthcare in Ahmedabad"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/85 to-white/60" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-2xl">
          <div className="inline-flex items-center bg-white shadow-lg rounded-full px-4 py-2 mb-6">
            <div className="flex items-center" aria-label="4.8 star rating">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <span className="ml-2 text-sm font-semibold">4.8 Rating</span>
            <span className="ml-2 text-sm text-gray-600">(47 Reviews)</span>
          </div>

          <h2 className="text-5xl md:text-6xl font-bold mb-4 leading-tight">
            Compassionate Care,
            <span className="block bg-gradient-to-r from-teal-600 to-teal-400 bg-clip-text text-transparent">Expert Treatment</span>
          </h2>
          
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            Dr. Aishwarya Radia brings 9 years of medical excellence to Faith Clinic, 
            providing personalized healthcare with humanity and advanced treatment.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="text-lg bg-green-500 hover:bg-green-600 text-white border-0">
                <MessageCircle className="mr-2" />
                Book Appointment on WhatsApp
              </Button>
            </a>
            <a href="tel:+919429907575">
              <Button variant="outline" size="lg" className="text-lg">
                <Phone className="mr-2" />
                Call Us
              </Button>
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4">
              <Clock className="w-6 h-6 text-teal-600 mb-2" />
              <p className="text-sm font-semibold">Mon - Fri</p>
              <p className="text-xs text-gray-600">09:30 AM - 12:30 PM</p>
              <p className="text-xs text-gray-600">05:30 PM - 07:30 PM</p>
              <p className="text-xs text-gray-600 mt-1">Sat: 09:30 AM - 12:30 PM</p>
            </Card>
            <Card className="p-4">
              <MapPin className="w-6 h-6 text-teal-600 mb-2" />
              <p className="text-sm font-semibold">Prahladnagar</p>
              <p className="text-xs text-gray-600">Satellite Road, Ahmedabad</p>
            </Card>
            <Card className="p-4">
              <Star className="w-6 h-6 text-yellow-400 mb-2" />
              <p className="text-sm font-semibold">9 Years</p>
              <p className="text-xs text-gray-600">Medical Excellence</p>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}

function AboutSection() {
  const stats = [
    { icon: Users, value: "7000+", label: "Happy Patients" },
    { icon: Award, value: "9 Years", label: "Experience" },
    { icon: Heart, value: "4.8", label: "Patient Rating" },
    { icon: TrendingUp, value: "95%", label: "Success Rate" },
  ];

  return (
    <section id="about" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-block bg-teal-100 text-teal-600 px-4 py-2 rounded-full text-sm font-semibold mb-4">
              About Our Practice
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Dr. Aishwarya Radia
            </h2>
            <div className="space-y-4 text-gray-600 text-lg">
              <p>
                Dr. Aishwarya Radia is a dedicated General Physician with 9 years of comprehensive 
                medical experience. Her approach combines advanced medical expertise with 
                genuine compassion for every patient.
              </p>
              <p>
                At Faith Clinic, we specialize in treating a wide range of conditions 
                including Type 2 Diabetes, Hypertension, Gastroenteritis, and infectious 
                diseases like Malaria and Dengue.
              </p>
              <blockquote className="text-teal-600 font-semibold border-l-4 border-teal-400 pl-4">
                "My philosophy is simple: treat patients with humanity alongside 
                providing the best medical care possible."
              </blockquote>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-8">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <Card key={index} className="p-6">
                    <Icon className="w-8 h-8 text-teal-600 mb-3" />
                    <p className="text-3xl font-bold mb-1">{stat.value}</p>
                    <p className="text-sm text-gray-600">{stat.label}</p>
                  </Card>
                );
              })}
            </div>
          </div>

          <div className="space-y-6">
            <Card className="p-6 hover:shadow-lg transition-all">
              <div className="flex items-start space-x-4">
                <div className="bg-gradient-to-r from-teal-600 to-teal-400 p-3 rounded-lg">
                  <Award className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Expert Diagnosis</h3>
                  <p className="text-gray-600">
                    Accurate diagnosis using modern medical techniques and thorough examination.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-all">
              <div className="flex items-start space-x-4">
                <div className="bg-gradient-to-r from-teal-600 to-teal-400 p-3 rounded-lg">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Compassionate Care</h3>
                  <p className="text-gray-600">
                    Patient-centered approach that treats you as a person, not just a case.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-all">
              <div className="flex items-start space-x-4">
                <div className="bg-gradient-to-r from-teal-600 to-teal-400 p-3 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Holistic Treatment</h3>
                  <p className="text-gray-600">
                    Comprehensive care plans addressing both immediate and long-term health goals.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}

function ServicesSection() {
  const services = [
    { icon: Stethoscope, title: "General Physician", description: "Comprehensive health checkups and treatment for common medical conditions." },
    { icon: Droplet, title: "Type 2 Diabetes Management", description: "Expert management and monitoring of diabetes with personalized treatment plans." },
    { icon: Activity, title: "Hypertension Care", description: "Blood pressure management and cardiovascular health monitoring." },
    { icon: Shield, title: "Infectious Disease Treatment", description: "Treatment for Malaria, Dengue, and other viral infections." },
    { icon: Heart, title: "Gastroenteritis Treatment", description: "Digestive system care and abdominal pain management." },
    { icon: Syringe, title: "Travel Vaccination", description: "Pre-travel health consultation and required immunizations." },
    { icon: Video, title: "Online Consultation", description: "Contact-less prescription and remote healthcare consultations." },
    { icon: Pill, title: "Preventive Healthcare", description: "Regular health screenings and wellness consultations." }
  ];

  return (
    <section id="services" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-block bg-teal-100 text-teal-600 px-4 py-2 rounded-full text-sm font-semibold mb-4">
            Our Services
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Comprehensive Healthcare Solutions
          </h2>
          <p className="text-gray-600 text-lg">
            From routine checkups to specialized treatments, we offer complete medical care for you and your family.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <Card key={index} className="p-6 hover:shadow-lg transition-all hover:-translate-y-1 group">
                <div className="bg-gradient-to-r from-teal-600 to-teal-400 p-4 rounded-lg w-fit mb-4 group-hover:scale-110 transition-transform">
                  <Icon className="w-6 h-6 text-white" aria-hidden="true" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{service.title}</h3>
                <p className="text-gray-600">{service.description}</p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function GallerySection() {
  const images = [
    { src: "/landing-assets/gallery/Capture1.PNG", title: "Faith Clinic Entrance, Prahladnagar Ahmedabad" },
    { src: "/landing-assets/gallery/Capture2.PNG", title: "Consultation Room at Faith Clinic" },
    { src: "/landing-assets/gallery/Capture3.PNG", title: "Medical Equipment at Faith Clinic" },
    { src: "/landing-assets/gallery/Capture4.PNG", title: "Reception Area – Faith Clinic" },
    { src: "/landing-assets/gallery/Capture5.PNG", title: "Examination Room – Dr. Aishwarya Radia" },
    { src: "/landing-assets/gallery/Capture6.PNG", title: "Patient Waiting Area – Faith Clinic" }
  ];

  return (
    <section className="py-20 bg-gray-50" aria-label="Clinic gallery">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-block bg-teal-100 text-teal-600 px-4 py-2 rounded-full text-sm font-semibold mb-4">
            Our Facility
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Modern & Comfortable Clinic
          </h2>
          <p className="text-gray-600 text-lg">
            Experience healthcare in a clean, modern, and welcoming environment designed for your comfort.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {images.map((image, index) => (
            <div key={index} className="group relative overflow-hidden rounded-xl shadow-lg hover:shadow-xl transition-all">
              <Image 
                src={image.src}
                alt={image.title}
                width={400}
                height={300}
                className="w-full h-64 object-cover transition-transform group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <p className="text-white font-semibold text-lg">{image.title}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  const testimonials = [
    { name: "Rajesh Patel", condition: "Type 2 Diabetes Patient", rating: 5, text: "The doctor's knowledge and skills have helped me manage my diabetes effectively. Their caring approach and clear explanations make every visit reassuring." },
    { name: "Priya Shah", condition: "General Health Checkup", rating: 5, text: "The prompt diagnosis and treatment I received at Faith Clinic led to quick recovery. The medical team is truly dedicated to their patients' wellbeing." },
    { name: "Amit Desai", condition: "Hypertension Treatment", rating: 5, text: "I appreciate the positive and compassionate approach. The doctor takes time to understand the complete picture before recommending treatment." },
    { name: "Meera Thakkar", condition: "Travel Vaccination", rating: 4, text: "Excellent consultation for travel health. The doctor provided comprehensive advice and ensured all vaccinations were done comfortably." },
    { name: "Kiran Modi", condition: "Gastroenteritis Treatment", rating: 5, text: "Fast relief from abdominal issues! The treatment was effective and the follow-up care ensured complete recovery." },
    { name: "Vikram Joshi", condition: "Dengue Treatment", rating: 5, text: "The expertise in handling dengue was exceptional. The monitoring and care during recovery were outstanding." }
  ];

  return (
    <section id="testimonials" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-block bg-teal-100 text-teal-600 px-4 py-2 rounded-full text-sm font-semibold mb-4">
            Patient Testimonials
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            What Our Patients Say
          </h2>
          <p className="text-gray-600 text-lg">
            Real experiences from real patients who've trusted Faith Clinic for their healthcare needs.
          </p>
          
          <div className="flex items-center justify-center mt-8 space-x-3">
            <div className="flex" aria-label="4.8 out of 5 stars">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-6 h-6 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <span className="text-2xl font-bold">4.8</span>
            <span className="text-gray-600">out of 5 (47 reviews)</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="p-6 hover:shadow-lg transition-all hover:-translate-y-1 relative overflow-hidden">
              <Quote className="absolute top-4 right-4 w-12 h-12 text-teal-100" aria-hidden="true" />
              
              <div className="flex mb-4" aria-label={`${testimonial.rating} out of 5 stars`}>
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>

              <blockquote className="mb-6 relative z-10">"{testimonial.text}"</blockquote>

              <footer className="border-t pt-4">
                <p className="font-semibold">{testimonial.name}</p>
                <p className="text-sm text-gray-600">{testimonial.condition}</p>
              </footer>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function InstagramSection() {
  const tips = [
    { emoji: "🩺", title: "Managing Diabetes Daily", desc: "Simple habits to keep your blood sugar in check throughout the day." },
    { emoji: "❤️", title: "Blood Pressure & You", desc: "What your BP numbers really mean and when to see a doctor." },
    { emoji: "💧", title: "Hydration & Health", desc: "How much water you actually need — and signs you're not drinking enough." },
    { emoji: "🦟", title: "Dengue: Early Signs", desc: "Spot dengue fever early and know exactly when to seek treatment." },
    { emoji: "🥗", title: "Eating for Energy", desc: "Foods that fight fatigue and keep you active all day." },
    { emoji: "😴", title: "Sleep & Immunity", desc: "Why good sleep is your most powerful medicine." },
  ];

  return (
    <section className="py-20 bg-gradient-to-b from-white to-pink-50/30">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-100 to-purple-100 text-pink-600 px-4 py-2 rounded-full text-sm font-semibold mb-4">
            <Instagram className="w-4 h-4" aria-hidden="true" />
            Follow on Instagram
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Health Tips from Dr. Radia
          </h2>
          <p className="text-gray-600 text-lg">
            Dr. Aishwarya shares practical health advice and wellness tips regularly on Instagram. Follow to stay informed.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {tips.map((tip, index) => (
            <Card key={index} className="p-6 hover:shadow-lg transition-all hover:-translate-y-1 border border-pink-100/60 bg-white">
              <div className="text-4xl mb-4" role="img" aria-label={tip.title}>{tip.emoji}</div>
              <h3 className="text-lg font-semibold mb-2">{tip.title}</h3>
              <p className="text-gray-600 text-sm">{tip.desc}</p>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <a
            href={INSTAGRAM_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white font-semibold px-8 py-4 rounded-full hover:opacity-90 transition-opacity text-lg shadow-lg"
          >
            <Instagram className="w-5 h-5" aria-hidden="true" />
            Follow @faithclinic for Health Tips
            <ExternalLink className="w-4 h-4" aria-hidden="true" />
          </a>
          <p className="text-gray-500 text-sm mt-3">New health tips posted regularly</p>
        </div>
      </div>
    </section>
  );
}

function ContactSection() {
  return (
    <section id="contact" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-block bg-teal-100 text-teal-600 px-4 py-2 rounded-full text-sm font-semibold mb-4">
            Get In Touch
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Visit Faith Clinic
          </h2>
          <p className="text-gray-600 text-lg">
            Book your appointment today and experience compassionate healthcare.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          <div className="space-y-6">
            <Card className="p-6 hover:shadow-lg transition-all">
              <div className="flex items-start space-x-4">
                <div className="bg-gradient-to-r from-teal-600 to-teal-400 p-3 rounded-lg">
                  <MapPin className="w-6 h-6 text-white" aria-hidden="true" />
                </div>
                <address className="not-italic">
                  <h3 className="text-lg font-semibold mb-2">Clinic Address</h3>
                  <p className="text-gray-600">
                    16, Ground Floor Vraj Vihar-7<br />
                    Near Venus Atlantis, Satellite Road<br />
                    Prahladnagar, Ahmedabad – 380015
                  </p>
                </address>
              </div>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-all">
              <div className="flex items-start space-x-4">
                <div className="bg-gradient-to-r from-teal-600 to-teal-400 p-3 rounded-lg">
                  <Clock className="w-6 h-6 text-white" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Clinic Hours</h3>
                  <div className="space-y-1 text-gray-600">
                    <p>Monday – Friday</p>
                    <p className="font-semibold">09:30 AM – 12:30 PM</p>
                    <p className="font-semibold">05:30 PM – 07:30 PM</p>
                    <p className="mt-2">Saturday</p>
                    <p className="font-semibold">09:30 AM – 12:30 PM</p>
                    <p className="text-sm text-red-600 mt-2">Sunday: Closed</p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-all">
              <div className="flex items-start space-x-4">
                <div className="bg-gradient-to-r from-teal-600 to-teal-400 p-3 rounded-lg">
                  <Phone className="w-6 h-6 text-white" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Contact Number</h3>
                  <a href="tel:+919429907575" className="text-teal-600 hover:underline block">
                    +91 94299 07575
                  </a>
                </div>
              </div>
            </Card>
          </div>

          <div className="h-full min-h-[500px]">
            <Card className="h-full p-0 overflow-hidden">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3672.375695329835!2d72.5112832!3d23.0099739!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x395e9b9ce31b4c1f%3A0xbd0c41168a1c5b6e!2sFaith%20Clinic%20-%20Dr.%20Aishwarya%20Radia!5e0!3m2!1sen!2sin!4v1786290251823!5m2!1sen!2sin"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                className="rounded-lg"
                title="Faith Clinic location on Google Maps – Prahladnagar, Ahmedabad"
              />
            </Card>
          </div>
        </div>

        <div className="mt-16 text-center bg-gradient-to-r from-teal-600 to-teal-400 rounded-2xl p-12">
          <h3 className="text-3xl font-bold text-white mb-4">
            Ready to Experience Better Healthcare?
          </h3>
          <p className="text-white/90 mb-8 text-lg">
            Book your appointment with Dr. Aishwarya Radia today
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-white text-green-600 font-semibold px-8 py-4 rounded-full hover:bg-green-50 transition-colors text-lg shadow-lg">
              <MessageCircle className="w-5 h-5" aria-hidden="true" />
              Book via WhatsApp
            </a>
            <a href="tel:+919429907575"
              className="inline-flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 text-white font-semibold px-8 py-4 rounded-full transition-colors text-lg border border-white/40">
              <Phone className="w-5 h-5" aria-hidden="true" />
              Call +91 94299 07575
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function FooterSection() {
  return (
    <footer className="bg-gray-100 border-t py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-brand-teal p-2 rounded-xl">
                <Stethoscope className="h-6 w-6 text-white" aria-hidden="true" />
              </div>
              <div>
                <p className="text-lg font-bold text-brand-teal">Faith Clinic</p>
                <p className="text-sm text-gray-600">Medical Practice</p>
              </div>
            </div>
            <p className="text-gray-600 mb-4">
              Providing compassionate and expert healthcare with years of medical excellence. 
              Your health and wellbeing are our priority.
            </p>
            <div className="flex space-x-4">
              <a href={INSTAGRAM_LINK} target="_blank" rel="noopener noreferrer" aria-label="Follow Faith Clinic on Instagram" className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:opacity-80 text-white p-2 rounded-lg transition-all">
                <Instagram className="w-5 h-5" aria-hidden="true" />
              </a>
              <a href={YOUTUBE_LINK} target="_blank" rel="noopener noreferrer" aria-label="Watch Faith Clinic on YouTube" className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition-all">
                <Video className="w-5 h-5" aria-hidden="true" />
              </a>
              <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" aria-label="Book appointment via WhatsApp" className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-lg transition-all">
                <MessageCircle className="w-5 h-5" aria-hidden="true" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><a href="#home" className="text-gray-600 hover:text-teal-600 transition-colors">Home</a></li>
              <li><a href="#about" className="text-gray-600 hover:text-teal-600 transition-colors">About Doctor</a></li>
              <li><a href="#services" className="text-gray-600 hover:text-teal-600 transition-colors">Services</a></li>
              <li><a href="#testimonials" className="text-gray-600 hover:text-teal-600 transition-colors">Testimonials</a></li>
              <li><a href="#contact" className="text-gray-600 hover:text-teal-600 transition-colors">Contact</a></li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Services</h3>
            <ul className="space-y-2 text-gray-600 text-sm">
              <li>General Physician</li>
              <li>Diabetes Management</li>
              <li>Hypertension Care</li>
              <li>Travel Vaccination</li>
              <li>Preventive Healthcare</li>
            </ul>
          </div>
        </div>

        <div className="border-t pt-8 pb-20 md:pb-0">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-gray-600 text-sm">
              © {new Date().getFullYear()} Faith Clinic. All rights reserved.
            </p>
            <Link href="/auth/login" className="text-gray-500 hover:text-teal-600 text-xs flex items-center transition-colors">
              <LogIn className="w-3 h-3 mr-1" aria-hidden="true" />
              Login
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
