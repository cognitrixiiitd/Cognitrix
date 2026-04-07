import { QueryClient, QueryObserver } from "@tanstack/react-query";
const queryClient = new QueryClient();
const observer = new QueryObserver(queryClient, {
  queryKey: ['test'],
  queryFn: async () => 'data',
  enabled: false
});
console.log("isLoading:", observer.getCurrentResult().isLoading);
console.log("isPending:", observer.getCurrentResult().isPending);
console.log("fetchStatus:", observer.getCurrentResult().fetchStatus);
