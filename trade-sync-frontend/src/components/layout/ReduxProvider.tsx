"use client";
import { useLayoutEffect } from "react";
import { Provider } from "react-redux";
import { store } from "../../redux/slices/store";
import { hydrateAuth } from "../../redux/slices/authSlice";

export default function ReduxProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useLayoutEffect(() => {
    store.dispatch(hydrateAuth());
  }, []);

  return <Provider store={store}>{children}</Provider>;
}
