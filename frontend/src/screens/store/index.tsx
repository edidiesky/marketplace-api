import { lazy } from "react";

const StoreListing = lazy(() => import("./listings/index"));
const Payment = lazy(() => import("./payment/index"));
const Reviews = lazy(() => import("./reviews/index"));
const Single = lazy(() => import("./single/index"));

export { StoreListing, Payment, Single, Reviews };
