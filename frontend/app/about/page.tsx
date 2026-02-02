'use client';

import Image from 'next/image';
import { Target, Heart, Award, Users, TrendingUp, Sparkles } from 'lucide-react';

export default function AboutPage() {
  const team = [
    {
      name: 'Sarah Johnson',
      role: 'Founder & Creative Director',
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
    },
    {
      name: 'Emily Chen',
      role: 'Head of Design',
      image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop',
    },
    {
      name: 'Lisa Anderson',
      role: 'Operations Manager',
      image: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&h=400&fit=crop',
    },
    {
      name: 'Michelle Rodriguez',
      role: 'Brand Strategist',
      image: 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=400&h=400&fit=crop',
    },
  ];

  const milestones = [
    { year: '2018', event: 'Company Founded' },
    { year: '2019', event: 'First Flagship Store' },
    { year: '2020', event: 'Online Platform Launch' },
    { year: '2021', event: 'International Expansion' },
    { year: '2023', event: 'Sustainability Initiative' },
    { year: '2025', event: 'Innovation Hub Opening' },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative h-[70vh] bg-gray-900">
        <Image
          src="https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1600&h=900&fit=crop"
          alt="About Aviroze"
          fill
          className="object-cover opacity-50"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white px-4">
            <h1 className="text-5xl md:text-7xl font-serif font-bold mb-6">
              About Aviroze
            </h1>
            <p className="text-xl md:text-2xl text-gray-200 max-w-3xl mx-auto leading-relaxed">
              Empowering Women Through Fashion Since 2018
            </p>
          </div>
        </div>
      </div>

      {/* Our Story Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
          <div>
            <h2 className="text-4xl font-serif font-bold text-gray-900 mb-6">
              Our Story
            </h2>
            <div className="space-y-4 text-gray-600 leading-relaxed">
              <p>
                Aviroze was born from a simple yet powerful vision: to create fashion that celebrates every woman's unique beauty and strength. What started as a small boutique in 2018 has blossomed into a global brand dedicated to empowering women through exceptional design and quality craftsmanship.
              </p>
              <p>
                Our founder, Sarah Johnson, noticed a gap in the market for fashion that was both sophisticated and accessible, trendy yet timeless. With a background in haute couture and a passion for sustainable practices, she assembled a team of talented designers and visionaries who shared her dream of revolutionizing women's fashion.
              </p>
              <p>
                Today, Aviroze stands at the intersection of elegance and innovation. We curate collections that speak to the modern woman—confident, dynamic, and unapologetically herself. Each piece is thoughtfully designed to transition seamlessly from boardroom to evening out, ensuring you always look and feel your best.
              </p>
            </div>
          </div>
          <div className="relative h-[500px]">
            <Image
              src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=1000&fit=crop"
              alt="Our Story"
              fill
              className="object-cover rounded-lg"
            />
          </div>
        </div>

        {/* Mission & Vision */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
          <div className="bg-gray-50 p-8 rounded-lg">
            <h3 className="text-2xl font-serif font-bold text-gray-900 mb-4">
              Our Mission
            </h3>
            <p className="text-gray-600 leading-relaxed">
              To empower women worldwide by creating exceptional fashion that combines timeless elegance with contemporary style. We are committed to delivering superior quality, sustainable practices, and designs that inspire confidence and celebrate individuality in every woman who wears our pieces.
            </p>
          </div>
          <div className="bg-gray-50 p-8 rounded-lg">
            <h3 className="text-2xl font-serif font-bold text-gray-900 mb-4">
              Our Vision
            </h3>
            <p className="text-gray-600 leading-relaxed">
              To become the leading global fashion brand that champions women's empowerment, sustainability, and inclusivity. We envision a world where every woman has access to beautiful, responsibly-made fashion that makes her feel extraordinary, while we continue to set new standards for ethical and innovative practices in the fashion industry.
            </p>
          </div>
        </div>

        {/* Values Section */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-serif font-bold text-gray-900 mb-4">
              Our Values
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              These core principles guide everything we do, from design to delivery, ensuring we create fashion that makes a positive impact on both our customers and the world.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-900 text-white rounded-full mb-4">
                <Heart className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Passion for Fashion
              </h3>
              <p className="text-gray-600 text-sm">
                We believe fashion is more than clothing—it is self-expression, confidence, and artistry. Every piece we create reflects our deep love for design and our commitment to helping women feel beautiful.
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-900 text-white rounded-full mb-4">
                <Award className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Quality Excellence
              </h3>
              <p className="text-gray-600 text-sm">
                From fabric selection to final stitch, we maintain uncompromising standards. Our pieces are crafted to last, combining timeless design with meticulous attention to detail that you can see and feel.
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-900 text-white rounded-full mb-4">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Customer First
              </h3>
              <p className="text-gray-600 text-sm">
                Your satisfaction drives everything we do. We listen, adapt, and continuously improve to ensure every shopping experience exceeds expectations and builds lasting relationships with our community.
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-900 text-white rounded-full mb-4">
                <TrendingUp className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Innovation
              </h3>
              <p className="text-gray-600 text-sm">
                We stay ahead of trends while honoring classic elegance. Through innovative design techniques and modern silhouettes, we create fashion that is both contemporary and timeless.
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-900 text-white rounded-full mb-4">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Sustainability
              </h3>
              <p className="text-gray-600 text-sm">
                Fashion should never come at the planet's expense. We are committed to eco-friendly materials, ethical production, and responsible practices that protect our environment for future generations.
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-900 text-white rounded-full mb-4">
                <Target className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Empowerment
              </h3>
              <p className="text-gray-600 text-sm">
                Every woman deserves to feel powerful and confident. Our designs celebrate femininity in all its forms, empowering you to embrace your unique style and own every moment.
              </p>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-serif font-bold text-gray-900 mb-4">
              Our Journey
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              From a single boutique to a global fashion destination, discover the milestones that have shaped Aviroze into the brand we are today.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {milestones.map((milestone, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl font-serif font-bold text-gray-900 mb-2">
                  {milestone.year}
                </div>
                <div className="h-1 w-12 bg-gray-900 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">{milestone.event}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Team Section */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-serif font-bold text-gray-900 mb-4">
              Meet Our Team
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              The passionate visionaries behind Aviroze who bring creativity, expertise, and dedication to every collection we create.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {team.map((member, index) => (
              <div key={index} className="text-center group">
                <div className="relative h-64 mb-4 overflow-hidden rounded-lg">
                  <Image
                    src={member.image}
                    alt={member.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {member.name}
                </h3>
                <p className="text-sm text-gray-600">{member.role}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Stats Section */}
        <div className="bg-gray-900 text-white rounded-lg p-12 mb-20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl md:text-5xl font-bold mb-2">10K+</div>
              <p className="text-gray-300">Happy Customers</p>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold mb-2">500+</div>
              <p className="text-gray-300">Products</p>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold mb-2">15+</div>
              <p className="text-gray-300">Countries</p>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold mb-2">98%</div>
              <p className="text-gray-300">Satisfaction</p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <h2 className="text-3xl font-serif font-bold text-gray-900 mb-4">
            Ready to Explore Our Collections?
          </h2>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Discover curated collections designed to elevate your wardrobe and celebrate your unique style. From timeless classics to contemporary trends, find pieces that speak to you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/products"
              className="inline-block bg-black text-white px-8 py-3 text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              Shop Now
            </a>
            <a
              href="/collections"
              className="inline-block border border-gray-900 text-gray-900 px-8 py-3 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              View Collections
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
