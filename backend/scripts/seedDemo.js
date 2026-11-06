const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.join(__dirname, "../.env") });

const bcrypt = require("bcryptjs");
const ConnectToDB = require("../models/db");
const UserModel = require("../models/userModel");
const CategoryModel = require("../models/categoryModel");
const ServiceModel = require("../models/serviceModel");
const BookingModel = require("../models/bookingModel");
const ReviewModel = require("../models/reviewModel");
const SettingModel = require("../models/settingModel");
const { getNextSequence } = require("../models/counterModel");

const seedDemo = async () => {
  try {
    await ConnectToDB();
    console.log("Connected to MongoDB for Demo Seeding...");

    // 1. Settings
    let settings = await SettingModel.findOne();
    if (!settings) {
      settings = await SettingModel.create({
        cancellationWindowHours: 12,
        bookingHorizonDays: 30,
        autoConfirmBookings: false,
        platformName: "FixPoint",
        supportEmail: "support@fixpoint.com",
        commissionPercent: 10,
      });
      console.log("Created Platform Settings.");
    }

    // 2. Categories
    const categoriesData = [
      { name: "Home Cleaner", slug: "home-cleaner", description: "Deep cleaning, dusting, and hygiene maintenance." },
      { name: "Electrician", slug: "electrician", description: "Wiring, circuit boards, switches, appliances, and fixtures." },
      { name: "Plumber", slug: "plumber", description: "Pipe leaks, tap fixtures, drain cleaning, and water pumps." },
      { name: "Carpenter", slug: "carpenter", description: "Furniture repair, door locks, shelving, and woodwork." },
      { name: "Painter", slug: "painter", description: "Interior and exterior wall painting, touch-ups, and coatings." },
    ];

    for (const cat of categoriesData) {
      await CategoryModel.findOneAndUpdate({ slug: cat.slug }, cat, { upsert: true, new: true });
    }
    console.log("Seeded Categories.");

    // 3. Create Admin
    const adminEmail = process.env.ADMIN_EMAIL || "admin@fixpoint.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "Admin123456!";
    const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);

    let admin = await UserModel.findOne({ email: adminEmail });
    if (!admin) {
      admin = await UserModel.create({
        firstName: "System",
        lastName: "Admin",
        email: adminEmail,
        password: hashedAdminPassword,
        role: "ADMIN",
        isVerified: true,
      });
      console.log("Created Admin:", adminEmail);
    }

    // 4. Create Demo Customer
    const customerPassword = await bcrypt.hash("Customer123!", 10);
    let customer = await UserModel.findOne({ email: "customer@fixpoint.com" });
    if (!customer) {
      customer = await UserModel.create({
        firstName: "Bilal",
        lastName: "Ahmed",
        email: "customer@fixpoint.com",
        password: customerPassword,
        phone: "03001234567",
        role: "CUSTOMER",
        isVerified: true,
        city: "Lahore",
        address: "House 24, Block C, Model Town",
      });
      console.log("Created Customer: customer@fixpoint.com / Customer123!");
    }

    // 5. Create Approved Provider (Electrician)
    const providerPassword = await bcrypt.hash("Provider123!", 10);
    let provider = await UserModel.findOne({ email: "electrician@fixpoint.com" });
    if (!provider) {
      provider = await UserModel.create({
        firstName: "Tariq",
        lastName: "Mehmood",
        email: "electrician@fixpoint.com",
        password: providerPassword,
        phone: "03019876543",
        role: "PROVIDER",
        providerStatus: "approved",
        serviceCategory: "electrician",
        serviceArea: "Lahore",
        experienceYears: 7,
        bio: "Certified residential electrician with 7+ years of experience in wiring, breaker boxes, and AC installations.",
        workingSchedule: {
          workingDays: ["mon", "tue", "wed", "thu", "fri", "sat"],
          startTime: "09:00",
          endTime: "18:00",
          breakStart: "13:00",
          breakEnd: "14:00",
          daysOff: [],
        },
        rating: { average: 5, count: 1 },
        totalBookingsCompleted: 1,
        isVerified: true,
      });
      console.log("Created Provider: electrician@fixpoint.com / Provider123!");
    }

    // 6. Services for Provider
    let service1 = await ServiceModel.findOne({ providerId: provider._id, title: "AC Switch & Power Point Repair" });
    if (!service1) {
      service1 = await ServiceModel.create({
        providerId: provider._id,
        categorySlug: "electrician",
        title: "AC Switch & Power Point Repair",
        description: "Inspection and replacement of burnt or damaged AC power switches and sockets.",
        price: 1500,
        priceType: "fixed",
        durationMinutes: 45,
        serviceType: "repair",
        isActive: true,
      });
    }

    let service2 = await ServiceModel.findOne({ providerId: provider._id, title: "Full Home Electrical Safety Inspection" });
    if (!service2) {
      service2 = await ServiceModel.create({
        providerId: provider._id,
        categorySlug: "electrician",
        title: "Full Home Electrical Safety Inspection",
        description: "Complete testing of distribution board, earthing, breakers and voltage fluctuations.",
        price: 3500,
        priceType: "fixed",
        durationMinutes: 90,
        serviceType: "inspection",
        isActive: true,
      });
    }

    // 7. Completed Booking + Review
    let pastBooking = await BookingModel.findOne({ customerId: customer._id, status: "completed" });
    if (!pastBooking) {
      const seq = await getNextSequence("bookingId");
      pastBooking = await BookingModel.create({
        bookingId: `FP-${String(seq).padStart(6, "0")}`,
        customerId: customer._id,
        providerId: provider._id,
        serviceId: service1._id,
        serviceTitle: service1.title,
        categorySlug: "electrician",
        date: "2026-11-01",
        startTime: "10:00",
        endTime: "10:45",
        durationMinutes: 45,
        price: service1.price,
        priceSnapshot: service1.price,
        address: {
          street: customer.address,
          area: "Model Town",
          city: customer.city,
        },
        customerStreet: customer.address,
        customerCity: customer.city,
        customerPhone: customer.phone,
        status: "completed",
        reviewed: true,
      });

      await ReviewModel.create({
        bookingId: pastBooking._id,
        customerId: customer._id,
        providerId: provider._id,
        serviceId: service1._id,
        rating: 5,
        comment: "Tariq arrived punctually with proper tools, replaced the burnt AC switch safely, and tested everything.",
        customerName: `${customer.firstName} ${customer.lastName[0]}.`,
      });

      console.log("Created Past Completed Booking and Review.");
    }

    // 8. Upcoming Confirmed Booking
    let upcomingBooking = await BookingModel.findOne({ customerId: customer._id, status: "confirmed" });
    if (!upcomingBooking) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 2);
      const tomorrowStr = tomorrow.toISOString().split("T")[0];

      const seq2 = await getNextSequence("bookingId");
      upcomingBooking = await BookingModel.create({
        bookingId: `FP-${String(seq2).padStart(6, "0")}`,
        customerId: customer._id,
        providerId: provider._id,
        serviceId: service2._id,
        serviceTitle: service2.title,
        categorySlug: "electrician",
        date: tomorrowStr,
        startTime: "11:00",
        endTime: "12:30",
        durationMinutes: 90,
        price: service2.price,
        priceSnapshot: service2.price,
        address: {
          street: customer.address,
          area: "Model Town",
          city: customer.city,
        },
        customerStreet: customer.address,
        customerCity: customer.city,
        customerPhone: customer.phone,
        status: "confirmed",
      });
      console.log("Created Upcoming Confirmed Booking:", upcomingBooking.bookingId);
    }

    console.log("=== Demo Seeding Complete! ===");
    process.exit(0);
  } catch (error) {
    console.error("Demo seeding failed:", error);
    process.exit(1);
  }
};

seedDemo();
