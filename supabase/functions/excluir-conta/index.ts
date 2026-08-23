import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleDeleteAccountRequest } from "../_shared/delete-account.ts";

serve(handleDeleteAccountRequest);
