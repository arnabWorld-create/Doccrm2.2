'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Star, Calendar, Clock, MapPin, Phone, Mail, LogIn, Menu,
  Award, Heart, Users, TrendingUp, Activity, Droplet, Eye, 
  Shield, Stethoscope, Syringe, Pill, Quote, MessageCircle,
  Instagram, Video, X
} from 'lucide-react';
import { useState } from 'react';

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-3">
              <div className="bg-brand-red p-2 rounded-xl">
                <Stethoscope className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-brand-teal">Faith Clinic</h1>
                <p className="text-xs text-gray-600">Medical Practice</p>
              </div>
            </div>

            <nav className="hidden md:flex items-center space-x-8">
              <a href="#home" className="hover:text-teal-600 transition-colors">Home</a>
              <a href="#about" className="hover:text-teal-600 transition-colors">About</a>
              <a href="#services" className="hover:text-teal-600 transition-colors">Services</a>
              <a href="#testimonials" className="hover:text-teal-600 transition-colors">Testimonials</a>
              <a href="#contact" className="hover:text-teal-600 transition-colors">Contact</a>
            </nav>

            <div className="hidden md:flex items-center space-x-4">
              <a href="tel:+919429907575" className="flex items-center text-sm text-gray-600 hover:text-teal-600 transition-colors">
                <Phone className="w-4 h-4 mr-2" />
                Call Us
              </a>

            </div>

            <button 
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t">
              <nav className="flex flex-col space-y-4">
                <a href="#home" className="hover:text-teal-600 transition-colors">Home</a>
                <a href="#about" className="hover:text-teal-600 transition-colors">About</a>
                <a href="#services" className="hover:text-teal-600 transition-colors">Services</a>
                <a href="#testimonials" className="hover:text-teal-600 transition-colors">Testimonials</a>
                <a href="#contact" className="hover:text-teal-600 transition-colors">Contact</a>
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
        
        {/* Contact Section */}
        <ContactSection />
      </main>

      {/* Footer */}
      <FooterSection />
    </div>
  );
}

function HeroSection() {
  return (
    <section id="home" className="relative min-h-[600px] flex items-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <Image 
          src="/landing-assets/hero-bg.jpg?v=2"
          alt="Medical Practice" 
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/85 to-white/60" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-2xl">
          <div className="inline-flex items-center bg-white shadow-lg rounded-full px-4 py-2 mb-6">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <span className="ml-2 text-sm font-semibold">4.8 Rating</span>
            <span className="ml-2 text-sm text-gray-600">(47 Reviews)</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold mb-4 leading-tight">
            Compassionate Care,
            <span className="block bg-gradient-to-r from-teal-600 to-teal-400 bg-clip-text text-transparent">Expert Treatment</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            Our medical practice brings years of medical excellence to Faith Clinic, 
            providing personalized healthcare with humanity and advanced treatment.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <a href="tel:+919879788889">
              <Button variant="outline" size="lg" className="text-lg">
                <Phone className="mr-2" />
                Contact Us
              </Button>
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4">
              <Clock className="w-6 h-6 text-teal-600 mb-2" />
              <p className="text-sm font-semibold">Mon - Fri</p>
              <p className="text-xs text-gray-600">09:30 AM - 12:30 PM & 05:30 PM - 07:30 PM</p>
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
    { icon: Users, value: "4000+", label: "Happy Patients" },
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
              Healing Beyond Medicines
            </h2>
            <div className="space-y-4 text-gray-600 text-lg">
              <p>
                Our medical practice is dedicated to providing comprehensive healthcare with 
                years of medical experience. Our approach combines advanced medical 
                expertise with genuine compassion for every patient.
              </p>
              <p>
                At Faith Clinic, we specialize in treating a wide range of conditions 
                including Type 2 Diabetes, Hypertension, Gastroenteritis, and infectious 
                diseases like Malaria and Dengue.
              </p>
              <p className="text-teal-600 font-semibold">
                "My philosophy is simple: treat patients with humanity alongside 
                providing the best medical care possible."
              </p>
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
                  <Icon className="w-6 h-6 text-white" />
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
    { src: "/landing-assets/gallery/Capture1.PNG", title: "Clinic Entrance" },
    { src: "/landing-assets/gallery/Capture2.PNG", title: "Consultation Room" },
    { src: "/landing-assets/gallery/Capture3.PNG", title: "Medical Equipment" },
    { src: "/landing-assets/gallery/Capture4.PNG", title: "Reception Area" },
    { src: "/landing-assets/gallery/Capture5.PNG", title: "Examination Room" },
    { src: "/landing-assets/gallery/Capture6.PNG", title: "Waiting Area" }
  ];

  return (
    <section className="py-20 bg-gray-50">
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
                  <h3 className="text-white font-semibold text-lg">{image.title}</h3>
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
    { name: "Meera Thakkar", condition: "Travel Vaccination", rating: 5, text: "Excellent consultation for travel health. The doctor provided comprehensive advice and ensured all vaccinations were done comfortably." },
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
            <div className="flex">
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
              <Quote className="absolute top-4 right-4 w-12 h-12 text-teal-100" />
              
              <div className="flex mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>

              <p className="mb-6 relative z-10">"{testimonial.text}"</p>

              <div className="border-t pt-4">
                <p className="font-semibold">{testimonial.name}</p>
                <p className="text-sm text-gray-600">{testimonial.condition}</p>
              </div>
            </Card>
          ))}
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
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Clinic Address</h3>
                  <p className="text-gray-600">
                    16, Ground Floor Vraj Vihar-7<br />
                    Near Venus Atlantis, Satellite Road<br />
                    Prahladnagar, Ahmedabad-380015
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-all">
              <div className="flex items-start space-x-4">
                <div className="bg-gradient-to-r from-teal-600 to-teal-400 p-3 rounded-lg">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Clinic Hours</h3>
                  <div className="space-y-1 text-gray-600">
                    <p>Monday - Friday</p>
                    <p className="font-semibold">09:30 AM - 12:30 PM</p>
                    <p className="font-semibold">05:30 PM - 07:30 PM</p>
                    <p className="text-sm text-red-600 mt-2">Saturday & Sunday: Closed</p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-all">
              <div className="flex items-start space-x-4">
                <div className="bg-gradient-to-r from-teal-600 to-teal-400 p-3 rounded-lg">
                  <Phone className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Contact Numbers</h3>
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
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3671.7234567890123!2d72.51119614917364!3d23.010222858921864!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x395e9b9ce31b4c1f%3A0xbd0c41168a1c5b6e!2sDoXcia%20Medical%20Practice!5e1!3m2!1sen!2sin!4v1763463449371!5m2!1sen!2sin"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="rounded-lg"
                title="Faith Clinic Location"
              />
            </Card>
          </div>
        </div>

        <div className="mt-16 text-center bg-gradient-to-r from-teal-600 to-teal-400 rounded-2xl p-12">
          <h3 className="text-3xl font-bold text-white mb-4">
            Ready to Experience Better Healthcare?
          </h3>
          <p className="text-white/90 mb-6 text-lg">
            Book your appointment with our medical team today
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
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
              <div className="bg-brand-red p-2 rounded-xl">
                <Stethoscope className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-brand-teal">Faith Clinic</h3>
                <p className="text-sm text-gray-600">Medical Practice</p>
              </div>
            </div>
            <p className="text-gray-600 mb-4">
              Providing compassionate and expert healthcare with years of medical excellence. 
              Your health and wellbeing are our priority.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="bg-teal-100 hover:bg-teal-600 hover:text-white text-teal-600 p-2 rounded-lg transition-all">
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li><a href="#home" className="text-gray-600 hover:text-teal-600 transition-colors">Home</a></li>
              <li><a href="#about" className="text-gray-600 hover:text-teal-600 transition-colors">About Doctor</a></li>
              <li><a href="#services" className="text-gray-600 hover:text-teal-600 transition-colors">Services</a></li>
              <li><a href="#testimonials" className="text-gray-600 hover:text-teal-600 transition-colors">Testimonials</a></li>
              <li><a href="#contact" className="text-gray-600 hover:text-teal-600 transition-colors">Contact</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">Services</h4>
            <ul className="space-y-2 text-gray-600 text-sm">
              <li>General Physician</li>
              <li>Diabetes Management</li>
              <li>Hypertension Care</li>
              <li>Travel Vaccination</li>
              <li>Preventive Healthcare</li>
            </ul>
          </div>
        </div>

        <div className="border-t pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-gray-600 text-sm">
              © {new Date().getFullYear()} Faith Clinic. All rights reserved.
            </p>
            <Link href="/auth/login" className="text-gray-500 hover:text-teal-600 text-xs flex items-center transition-colors">
              <LogIn className="w-3 h-3 mr-1" />
              Login
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
