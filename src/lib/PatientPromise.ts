// Unlike Promise.all which rejects as soon as the first error occurs,
// PatientPromise.all waits until all the promises complete.
class PatientPromise {
  // Returns a promise that resolves to an array of only the valid results
  public static async all<T>(promises: Promise<T>[], onReject: (error: Error) => void): Promise<T[]> {
    const promisesWithCatch: Promise<T | Error>[] = promises.map(promise => promise.catch(error => {
      onReject(error);
      return error;
    }));
    const results = await Promise.all(promisesWithCatch);
    return results.filter(result => !(result instanceof Error)) as T[];
  }
}

export default PatientPromise;