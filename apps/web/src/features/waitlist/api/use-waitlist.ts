import { useMutation } from '@tanstack/react-query';
import { confirmWaitlist, joinWaitlist } from '@/lib/callables';

export function useJoinWaitlist() {
  return useMutation({ mutationFn: joinWaitlist });
}

export function useConfirmWaitlist() {
  return useMutation({ mutationFn: confirmWaitlist });
}
