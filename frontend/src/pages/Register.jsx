import { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

// ---------- Step Schemas ----------
const step1Schema = z.object({
  fullName: z.string().min(2, 'Full name required'),
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD').refine((dob) => {
    const age = new Date().getFullYear() - new Date(dob).getFullYear();
    return age >= 18;
  }, 'Must be 18 or older'),
  phoneNumber: z.string().regex(/^\d{10}$/, '10-digit phone number'),
  ssn: z.string().regex(/^\d{3}-\d{2}-\d{4}$/, 'SSN format: 123-45-6789').optional(),
});

const step2Schema = z.object({
  addressLine1: z.string().min(5, 'Street address required'),
  addressLine2: z.string().optional(),
  city: z.string().min(2, 'City required'),
  state: z.string().length(2, 'State abbreviation (2 letters)'),
  zipCode: z.string().regex(/^\d{5}$/, '5-digit ZIP'),
  employmentStatus: z.enum(['employed', 'self-employed', 'unemployed', 'retired', 'student']),
  annualIncome: z.number().min(0, 'Annual income required'),
});

const step3Schema = z.object({
  fundingMethod: z.enum(['external', 'directDeposit']),
  routingNumber: z.string().optional(),
  accountNumber: z.string().optional(),
  agreeTerms: z.boolean().refine(val => val === true, 'You must agree to the terms'),
}).superRefine((data, ctx) => {
  if (data.fundingMethod === 'external') {
    if (!data.routingNumber || !/^\d{9}$/.test(data.routingNumber)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['routingNumber'],
        message: '9-digit routing number required',
      });
    }
    if (!data.accountNumber || !/^\d{10,12}$/.test(data.accountNumber)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['accountNumber'],
        message: '10-12 digit account number required',
      });
    }
  }
});

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

export default function Register() {
  const { register: authRegister } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const methods = useForm({
    resolver: zodResolver(
      step === 1 ? step1Schema : step === 2 ? step2Schema : step3Schema
    ),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      dateOfBirth: '',
      phoneNumber: '',
      ssn: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      zipCode: '',
      employmentStatus: 'employed',
      annualIncome: 0,
      fundingMethod: 'directDeposit',  // changed default to avoid external validation
      routingNumber: '',
      accountNumber: '',
      agreeTerms: false,
    },
    mode: 'onChange',
  });

  const { handleSubmit, trigger, formState: { errors } } = methods;

  const nextStep = async () => {
    const isValid = await trigger();
    if (isValid) setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setError('');
    console.log('Submitting registration data:', data);
    try {
      const INITIAL_BALANCE = 950000000;
      await authRegister(
        data.email,
        data.password,
        data.fullName,
        INITIAL_BALANCE,
        data
      );
      navigate('/dashboard');
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">Tell us about yourself</h2>
            <div>
              <label className="block text-sm font-medium">Full name</label>
              <input {...methods.register('fullName')} autoComplete="name" className="w-full border rounded-lg p-2" />
              {errors.fullName && <p className="text-red-500 text-sm">{errors.fullName.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium">Email</label>
              <input {...methods.register('email')} autoComplete="email" className="w-full border rounded-lg p-2" />
              {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium">Password</label>
              <input type="password" {...methods.register('password')} autoComplete="new-password" className="w-full border rounded-lg p-2" />
              {errors.password && <p className="text-red-500 text-sm">{errors.password.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium">Date of birth (YYYY-MM-DD)</label>
              <input {...methods.register('dateOfBirth')} autoComplete="bday" placeholder="1990-01-01" className="w-full border rounded-lg p-2" />
              {errors.dateOfBirth && <p className="text-red-500 text-sm">{errors.dateOfBirth.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium">Phone number (10 digits)</label>
              <input {...methods.register('phoneNumber')} autoComplete="tel" placeholder="1234567890" className="w-full border rounded-lg p-2" />
              {errors.phoneNumber && <p className="text-red-500 text-sm">{errors.phoneNumber.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium">Social Security Number</label>
              <input {...methods.register('ssn')} autoComplete="off" placeholder="123-45-6789" className="w-full border rounded-lg p-2" />
              {errors.ssn && <p className="text-red-500 text-sm">{errors.ssn.message}</p>}
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">Your address & employment</h2>
            <div>
              <label className="block text-sm font-medium">Street address</label>
              <input {...methods.register('addressLine1')} autoComplete="address-line1" className="w-full border rounded-lg p-2" />
              {errors.addressLine1 && <p className="text-red-500 text-sm">{errors.addressLine1.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium">Apt / Suite (optional)</label>
              <input {...methods.register('addressLine2')} autoComplete="address-line2" className="w-full border rounded-lg p-2" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium">City</label>
                <input {...methods.register('city')} autoComplete="address-level2" className="w-full border rounded-lg p-2" />
                {errors.city && <p className="text-red-500 text-sm">{errors.city.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium">State</label>
                <select {...methods.register('state')} autoComplete="address-level1" className="w-full border rounded-lg p-2">
                  <option value="">Select</option>
                  {US_STATES.map(st => <option key={st} value={st}>{st}</option>)}
                </select>
                {errors.state && <p className="text-red-500 text-sm">{errors.state.message}</p>}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium">ZIP code</label>
              <input {...methods.register('zipCode')} autoComplete="postal-code" className="w-full border rounded-lg p-2" />
              {errors.zipCode && <p className="text-red-500 text-sm">{errors.zipCode.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium">Employment status</label>
              <select {...methods.register('employmentStatus')} className="w-full border rounded-lg p-2">
                <option value="employed">Employed</option>
                <option value="self-employed">Self‑employed</option>
                <option value="unemployed">Unemployed</option>
                <option value="retired">Retired</option>
                <option value="student">Student</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Annual income ($)</label>
              <input type="number" {...methods.register('annualIncome', { valueAsNumber: true })} autoComplete="off" className="w-full border rounded-lg p-2" />
              {errors.annualIncome && <p className="text-red-500 text-sm">{errors.annualIncome.message}</p>}
            </div>
          </div>
        );
      case 3:
        const fundingMethod = methods.watch('fundingMethod');
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">Fund your account</h2>
            <div>
              <label className="block text-sm font-medium">How would you like to deposit money?</label>
              <select {...methods.register('fundingMethod')} className="w-full border rounded-lg p-2">
                <option value="directDeposit">Set up direct deposit later</option>
                <option value="external">Link an external bank account</option>
              </select>
            </div>
            {fundingMethod === 'external' && (
              <>
                <div>
                  <label className="block text-sm font-medium">Routing number</label>
                  <input {...methods.register('routingNumber')} autoComplete="off" className="w-full border rounded-lg p-2" />
                  {errors.routingNumber && <p className="text-red-500 text-sm">{errors.routingNumber.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium">Account number</label>
                  <input {...methods.register('accountNumber')} autoComplete="off" className="w-full border rounded-lg p-2" />
                  {errors.accountNumber && <p className="text-red-500 text-sm">{errors.accountNumber.message}</p>}
                </div>
              </>
            )}
            <div className="flex items-center gap-2">
              <input type="checkbox" {...methods.register('agreeTerms')} />
              <label className="text-sm">I agree to the <a href="#" className="text-blue-600">Terms & Conditions</a> and <a href="#" className="text-blue-600">Electronic Disclosure</a></label>
            </div>
            {errors.agreeTerms && <p className="text-red-500 text-sm">{errors.agreeTerms.message}</p>}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-2xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-[#004977]">Open an Account</h1>
          <div className="text-sm text-gray-500">Step {step} of 3</div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
          <div className="bg-[#d22630] h-2 rounded-full transition-all" style={{ width: `${(step / 3) * 100}%` }}></div>
        </div>

        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)}>
            {renderStep()}
            {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
            <div className="flex justify-between mt-6">
              {step > 1 && (
                <button type="button" onClick={prevStep} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
                  Back
                </button>
              )}
              {step < 3 ? (
                <button type="button" onClick={nextStep} className="ml-auto bg-[#d22630] text-white px-6 py-2 rounded-lg hover:bg-red-700">
                  Continue
                </button>
              ) : (
                <button type="submit" disabled={isSubmitting} className="ml-auto bg-[#d22630] text-white px-6 py-2 rounded-lg hover:bg-red-700">
                  {isSubmitting ? 'Opening account...' : 'Open Account'}
                </button>
              )}
            </div>
          </form>
        </FormProvider>

        <p className="text-center text-sm text-gray-600 mt-8">
          Already have an account? <Link to="/login" className="text-[#004977] hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}