import PropTypes from 'prop-types';

export const Header = ({ onLogin }) => (
  <nav className="bg-surface-default shadow-sm fixed w-full z-10">
    <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between h-16">
        <div className="flex items-center">
          <span className="text-2xl font-bold text-primary-base">MeetingSummarizer</span>
        </div>
        <div className="flex items-center">
          <button
            onClick={onLogin}
            className="px-4 py-2 text-sm font-medium text-surface-default bg-primary-base rounded-md hover:bg-primary-hover active:bg-primary-active"
          >
            Login
          </button>
        </div>
      </div>
    </div>
  </nav>
);

Header.propTypes = {
  onLogin: PropTypes.func.isRequired
};