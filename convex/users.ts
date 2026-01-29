import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { createAuth, authComponent } from "./auth";

export const updateUserPassword = mutation({
  args: {
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    await auth.api.changePassword({
      body: {
        currentPassword: args.currentPassword,
        newPassword: args.newPassword,
      },
      headers,
    });
  },
});

export const test = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("test");
    return "test";
  },
});

export const signUp = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("signing up");
    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    console.log("auth", auth);
    console.log("headers", headers);
    try {
      await auth.api.signUpEmail({
        body: {
          email: args.email,
          password: args.password,
          name: args.name,
        },
        headers,
      })
    } catch (error) {
      console.error(error);
    }
  },
});

export const signIn = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("signing in");
    console.log(args);
    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    await auth.api.signInEmail({
      body: {
        email: args.email,
        password: args.password,
      },
      headers,
    })
  },
});