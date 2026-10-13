package bobby.classes
{
   import bobby.§_-07§;
   import bobby.§_-0v§;
   
   public class TransitionState extends TransitionBase
   {
      
      private var targetState:§_-07§;
      
      public function TransitionState(param1:§_-07§, param2:Number, param3:Number, param4:Number)
      {
         super(param2,param3,param4);
         this.targetState = param1;
      }
      
      override public function doSomething() : void
      {
         super.doSomething();
         §_-0v§.§_-4S§(this.targetState);
      }
   }
}

