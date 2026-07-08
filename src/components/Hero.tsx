// import { motion } from "framer-motion";
// import Button from "./ui/btn";
// import Image from "next/image";
// import { useRouter } from "next/navigation";

// export const Hero = () => {
//   const route = useRouter();
//   const DashboardImg =
//     "https://res.cloudinary.com/dipfghq3k/image/upload/v1783533589/InvoiceDash_zfgyck.png";
//   return (
//     <section className="min-h-screen w-full relative overflow-hidden flex flex-col items-center justify-center px-4 pt-28 pb-20">
//       <div className="absolute w-40 h-40 md:w-72 md:h-72 bg-primary rounded-full blur-3xl -right-10 top-20 opacity-60" />
//       <div className="absolute w-40 h-40 md:w-72 md:h-72 bg-deep-red rounded-full blur-3xl -left-10 top-24 opacity-60" />
//       <div className="absolute w-32 h-32 md:w-96 md:h-96 bg-secondary rounded-full blur-3xl left-1/3 -translate-x-1/2 top-40 opacity-50" />
//       <div className="absolute w-72 h-72 md:w-96 md:h-96 bg-blood-red rounded-full blur-3xl right-1/4 top-80 opacity-40" />

//       <div className="absolute inset-0 bg-white/70 backdrop-blur-2xl" />

//       <div
//         className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
//              w-175 h-125 md:w-250 md:h-175 
//              opacity-[0.1] overflow-hidden"
//         style={{
//           backgroundImage: `
//       linear-gradient(to right, #000 1px, transparent 1px),
//       linear-gradient(to bottom, #000 1px, transparent 1px)
//     `,
//           backgroundSize: "80px 80px",
//           maskImage: "radial-gradient(circle, black 30%, transparent 70%)",
//           WebkitMaskImage:
//             "radial-gradient(circle, black 30%, transparent 70%)",
//         }}
//       />

//       <div className="relative z-10 max-w-5xl flex flex-col items-center text-center">
//         <motion.h1
//           initial={{ opacity: 0, y: 40 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ duration: 0.7 }}
//           className="
//             text-3xl
//             sm:text-4xl
//             md:text-5xl
//             lg:text-6xl
//             font-medium
//             leading-tight
//             text-gray-900
//             font-Unbounded
//             w-full  px-5 md:px-0
//           "
//         >
//           Create Professional Invoices In{" "}
//           <span className="text-secondary">Under 3 Minutes</span>
//         </motion.h1>

//         <motion.p
//           initial={{ opacity: 0, y: 30 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ delay: 0.2, duration: 0.7 }}
//           className="
//             mt-6
//             text-sm
//             sm:text-base
//             md:text-lg
//             text-primary/80
//             max-w-2xl
//             px-7 md:px-0
//             leading-relaxed
//           "
//         >
//           Meet SwiftInvoice, the simple way to create and track invoices for
//           your business. Manage clients, monitor drafts and overdues faster all
//           from one clean dashboard.
//         </motion.p>

//         <motion.div
//           initial={{ opacity: 0, y: 25 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ delay: 0.35, duration: 0.7 }}
//           className="flex flex-col sm:flex-row items-center gap-4 mt-8"
//         >
//           <div className="w-40">
//             <Button variant="outline" onClick={() => route.push("/register")}>
//               Get Started
//             </Button>
//           </div>
//           <div className="w-40">
//             <Button variant="primary" onClick={() => route.push("/login")}>
//               Login
//             </Button>
//           </div>
//         </motion.div>
//       </div>

//       <motion.div
//         initial={{ opacity: 0, y: 50 }}
//         animate={{ opacity: 1, y: 0 }}
//         transition={{ delay: 0.5, duration: 0.8 }}
//         className="relative z-10 mt-14 w-full max-w-6xl px-4"
//       >
//         <div className="relative rounded-2xl border-4 border-accent/30 bg-white overflow-hidden">
//           <div className="absolute -inset-x-10 -top-10 h-20 bg-secondary/30 blur-2xl" />

//           <Image
//             src={DashboardImg}
//             alt="SwiftInvoice dashboard"
//             width={1920}
//             height={960}
//             priority
//             className="relative w-full h-auto object-cover"
//           />
//         </div>
//       </motion.div>
//     </section>
//   );
// };


import { motion } from "framer-motion";
import Button from "./ui/btn";
import Image from "next/image";
import { useRouter } from "next/navigation";

export const Hero = () => {
  const route = useRouter();

  const DashboardImg =
    "https://res.cloudinary.com/dipfghq3k/image/upload/v1783533589/InvoiceDash_zfgyck.png";

  return (
    <section className="min-h-screen w-full relative overflow-hidden flex flex-col items-center justify-center px-4 pt-28 pb-20">
      
      {/* Background Blobs */}
      <div className="absolute w-32 h-32 md:w-72 md:h-72 bg-primary rounded-full blur-3xl -right-10 top-20 opacity-30 md:opacity-60" />

      <div className="absolute w-32 h-32 md:w-72 md:h-72 bg-deep-red rounded-full blur-3xl -left-10 top-24 opacity-30 md:opacity-60" />

      <div className="absolute w-24 h-24 md:w-96 md:h-96 bg-secondary rounded-full blur-3xl left-1/3 -translate-x-1/2 top-40 opacity-20 md:opacity-50" />

      <div className="absolute w-48 h-48 md:w-96 md:h-96 bg-blood-red rounded-full blur-3xl right-1/4 top-80 opacity-20 md:opacity-40" />


      {/* White Glass Overlay */}
      <div className="absolute inset-0 bg-white/90 md:bg-white/70 backdrop-blur-xl md:backdrop-blur-2xl" />


      {/* Background Grid */}
      <div
        className="
          absolute top-1/2 left-1/2 
          -translate-x-1/2 -translate-y-1/2
          w-150 h-100 
          md:w-250 md:h-175
          opacity-[0.05] md:opacity-[0.1]
          overflow-hidden
        "
        style={{
          backgroundImage: `
            linear-gradient(to right, #000 1px, transparent 1px),
            linear-gradient(to bottom, #000 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
          maskImage: "radial-gradient(circle, black 30%, transparent 70%)",
          WebkitMaskImage:
            "radial-gradient(circle, black 30%, transparent 70%)",
        }}
      />


      {/* Hero Content */}
      <div className="relative z-10 max-w-5xl flex flex-col items-center text-center">
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="
            text-3xl
            sm:text-4xl
            md:text-5xl
            lg:text-6xl
            font-medium
            leading-tight
            text-gray-900
            font-Unbounded
            w-full
            px-5
            md:px-0
          "
        >
          Create Professional Invoices In{" "}
          <span className="text-secondary">
            Under 3 Minutes
          </span>
        </motion.h1>


        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.7 }}
          className="
            mt-6
            text-sm
            sm:text-base
            md:text-lg
            text-primary/80
            max-w-2xl
            px-7
            md:px-0
            leading-relaxed
          "
        >
          Meet SwiftInvoice, the simple way to create and track invoices for
          your business. Manage clients, monitor drafts and overdues faster all
          from one clean dashboard.
        </motion.p>


        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.7 }}
          className="flex flex-col sm:flex-row items-center gap-4 mt-8"
        >
          <div className="w-40">
            <Button
              variant="outline"
              onClick={() => route.push("/register")}
            >
              Get Started
            </Button>
          </div>

          <div className="w-40">
            <Button
              variant="primary"
              onClick={() => route.push("/login")}
            >
              Login
            </Button>
          </div>
        </motion.div>
      </div>


      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.8 }}
        className="relative z-10 mt-14 w-full max-w-6xl px-4"
      >
        <div className="relative rounded-2xl border-4 border-accent/30 bg-white/95 overflow-hidden shadow-xl">

          <div className="absolute -inset-x-10 -top-10 h-20 bg-secondary/30 blur-2xl" />


          <Image
            src={DashboardImg}
            alt="SwiftInvoice dashboard"
            width={1920}
            height={960}
            priority
            className="
              relative 
              w-full 
              h-auto 
              object-cover
            "
          />

        </div>
      </motion.div>

    </section>
  );
};