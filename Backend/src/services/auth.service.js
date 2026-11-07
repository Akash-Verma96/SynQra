import prisma from "../lib/prisma.js";

export const findOrCreateGoogleUser = async (googleUser) => {
  const { sub, email, name, picture, email_verified } = googleUser;

  return prisma.$transaction(async (tx) => {
    // Find existing Google account
    const existingAccount = await tx.authAccount.findUnique({
      where: {
        provider_providerUserId: {
          provider: "google",
          providerUserId: sub,
        },
      },
      include: {
        user: true,
      },
    });

    if (existingAccount) {
      return existingAccount.user;
    }

    // Check existing email
    const existingUser = await tx.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error(
        "An account with this email already exists. Account linking is required."
      );
    }

    // Create user and Google account atomically
    const user = await tx.user.create({
      data: {
        name,
        email,
        emailVerified: Boolean(email_verified),
        avatarUrl: picture,

        authAccounts: {
          create: {
            provider: "google",
            providerUserId: sub,
          },
        },
      },
    });

    return user;
  });
};
