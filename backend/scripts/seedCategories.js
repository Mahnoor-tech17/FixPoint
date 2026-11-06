const dotenv = require("dotenv");
const ConnectToDB = require("../models/db");
const CategoryModel = require("../models/categoryModel");

dotenv.config();

const categories = [
  { name: "Home Cleaner", slug: "home-cleaner", description: "Deep cleaning, kitchen, bathroom, sofa and carpet cleaning" },
  { name: "Electrician", slug: "electrician", description: "Wiring, fan and light installation, switchboard and appliance repair" },
  { name: "Plumber", slug: "plumber", description: "Leakage repair, taps, pipes, geyser and tank installation" },
  { name: "Carpenter", slug: "carpenter", description: "Furniture repair, doors, windows, wardrobes and cabinets" },
  { name: "Painter", slug: "painter", description: "Interior and exterior wall painting, polish and coating" },
];

const seed = async () => {
  try {
    await ConnectToDB();

    for (const cat of categories) {
      const exists = await CategoryModel.findOne({ slug: cat.slug });
      if (!exists) {
        await CategoryModel.create(cat);
        console.log("Added:", cat.name);
      } else {
        console.log("Already exists:", cat.name);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error("Seed error:", error.message);
    process.exit(1);
  }
};

seed();